import { getModelById, type ReasoningLevel } from "@/config/models";
import {
  createOrGetSession,
  generateTitleOnly,
  getMessages,
  saveAssistantMessageServer,
  saveUserMessageServer,
  serverAppendStreamId,
  serverGetLatestStreamIdWithStatus,
} from "@/services";
import { convertToAiMessages } from "@/utils/message-utils";
import { pub, sub } from "@/utils/redis";
import { createClient } from "@/utils/supabase/server";
import { createDataStream, streamText, type JSONValue, type Message } from "ai";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream/ioredis";
import { v4 as uuidv4 } from "uuid";
import { createErrorResponse, getErrorResponse, handleStreamError } from "./utils/errors";
import { handleImageGenerationRequest } from "./utils/image-generation";
import {
  buildProviderOptions,
  buildSystemMessage,
  createModelInstance,
  getModelMapping,
} from "./utils/models";
import { processMessages } from "./utils/process-messages";
import { getToolsForModel } from "./utils/tools";

let streamContext: ResumableStreamContext | undefined;
if (pub && sub) {
  streamContext = createResumableStreamContext({
    waitUntil: after,
    publisher: pub,
    subscriber: sub,
  });
} else {
  console.warn("Redis not configured, resumable streams are disabled.");
}

interface ChatRequest {
  messages: Message[];
  model?: string;
  reasoningLevel?: ReasoningLevel;
  searchEnabled?: boolean;
  memoryEnabled?: boolean;
  id?: string;
  isFirstMessage?: boolean;
  apiKey?: string;
  assistantName?: string;
  userTraits?: string;
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return createErrorResponse("chatId is required", 400, "BAD_REQUEST");
  }

  if (!streamContext) {
    return new Response(null, { status: 204 }); // Resuming not supported
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return createErrorResponse("User not authenticated", 401, "AUTH_ERROR");
  }

  // Check the most recent stream to see if it was cancelled
  const latestStream = await serverGetLatestStreamIdWithStatus(supabase, chatId);

  if (!latestStream) {
    return new Response(null, { status: 204 }); // No streams to resume
  }

  if (latestStream.cancelled) {
    console.log(`Stream ${latestStream.streamId} was cancelled by user, not resuming`);
    return new Response(null, { status: 204 }); // Stream was cancelled, don't resume
  }

  const recentStreamId = latestStream.streamId;

  const emptyDataStream = createDataStream({ execute: () => {} });
  const stream = await streamContext.resumableStream(recentStreamId, () => emptyDataStream);

  if (stream) {
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      status: 200,
    });
  }

  // Stream has already finished, but client might have missed the final message.
  // Send the last message to ensure client-side state is consistent.
  const dbMessages = await getMessages(chatId);
  const messages = convertToAiMessages(dbMessages);
  const mostRecentMessage = messages?.at(-1);

  if (!mostRecentMessage || mostRecentMessage.role !== "assistant") {
    return new Response(emptyDataStream, { status: 200 });
  }

  const streamWithMessage = createDataStream({
    execute: (buffer) => {
      buffer.writeData({
        type: "append-message",
        message: JSON.stringify(mostRecentMessage),
      });
    },
  });

  return new Response(streamWithMessage, { status: 200 });
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body: ChatRequest = await req.json();
    const {
      messages,
      model = "gemini-2.5-flash",
      reasoningLevel = "medium",
      searchEnabled = false,
      memoryEnabled = true,
      id,
      isFirstMessage = false,
      apiKey,
      assistantName,
      userTraits,
    } = body;

    const sessionId = id || uuidv4();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return createErrorResponse("User not authenticated", 401, "AUTH_ERROR");
    }

    const { sessionId: finalSessionId } = await createOrGetSession(user.id, sessionId);

    const modelConfig = getModelById(model);
    if (!modelConfig) {
      return createErrorResponse(`Model ${model} not found`, 400);
    }

    const mapping = getModelMapping(modelConfig, apiKey);
    if (!mapping.supported) {
      return createErrorResponse(mapping.message, 400);
    }

    const { coreMessages, userMessageToSave } = await processMessages(messages, modelConfig);

    if (userMessageToSave) {
      await saveUserMessageServer(supabase, userMessageToSave, finalSessionId, user.id);
    }

    if (modelConfig.capabilities.includes("image-generation")) {
      const lastUserMessage = messages[messages.length - 1];
      const prompt = typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "";
      return handleImageGenerationRequest(supabase, user, finalSessionId, modelConfig, prompt);
    }

    const systemMessage = buildSystemMessage(
      modelConfig,
      searchEnabled,
      memoryEnabled,
      userTraits,
      assistantName
    );
    const finalMessages = [{ role: "system" as const, content: systemMessage }, ...coreMessages];

    const modelInstance = createModelInstance(modelConfig, mapping, searchEnabled);
    const providerOptions = buildProviderOptions(modelConfig, reasoningLevel, apiKey);

    if (streamContext) {
      const streamId = uuidv4();
      await serverAppendStreamId(supabase, finalSessionId, streamId);

      const stream = createDataStream({
        execute: async (dataStream) => {
          const result = streamText({
            model: modelInstance,
            messages: finalMessages,
            maxSteps: 5,
            tools: getToolsForModel(user.id, searchEnabled, memoryEnabled, {
              capabilities: modelConfig.capabilities,
              supportsFunctions: modelConfig.supportsFunctions,
            }),
            // abortSignal: req.signal,
            ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
            onFinish: async ({ text, providerMetadata, response }) => {
              const logContext: {
                sessionId: string;
                userId: string;
                model: string;
                streamId: string;
                messageId?: string;
              } = {
                sessionId: finalSessionId,
                userId: user.id,
                model,
                streamId,
              };

              // Check if stream was cancelled before saving message
              try {
                const streamStatus = await serverGetLatestStreamIdWithStatus(
                  supabase,
                  finalSessionId
                );
                if (streamStatus?.streamId === streamId && streamStatus.cancelled) {
                  console.log(`Stream ${streamId} was cancelled, skipping message save`);
                  return; // Don't save message if stream was cancelled
                }
              } catch (error) {
                console.error("Error checking stream status:", {
                  ...logContext,
                  error,
                });
                // Continue with saving if we can't check status
              }

              // The stream can finish without any substantive content.
              if (!text && (!response || response.messages.length === 0)) {
                console.warn("Stream finished with no message content.", logContext);
                return;
              }

              const messageId = uuidv4();
              logContext.messageId = messageId;

              // Process response.messages to construct proper assistant message format
              let messageSaved = false;

              if (response.messages.length > 0) {
                try {
                  // Build the comprehensive assistant message from response.messages inline
                  const parts: Message["parts"] = [];
                  let fullContent = "";
                  let stepCount = 0;

                  for (const message of response.messages) {
                    if (message.role === "assistant" && Array.isArray(message.content)) {
                      for (const contentPart of message.content) {
                        if (contentPart.type === "text") {
                          parts.push({ type: "text", text: String(contentPart.text) });
                          fullContent += String(contentPart.text);
                        } else if (contentPart.type === "tool-call") {
                          // Find tool result for this tool call by looking in tool messages
                          let toolResult: unknown = "";
                          for (const toolMessage of response.messages) {
                            if (toolMessage.role === "tool" && Array.isArray(toolMessage.content)) {
                              for (const toolPart of toolMessage.content) {
                                if (
                                  toolPart.type === "tool-result" &&
                                  toolPart.toolCallId === contentPart.toolCallId
                                ) {
                                  toolResult = toolPart.result;
                                  break;
                                }
                              }
                            }
                            if (toolResult) break;
                          }

                          const toolInvocation = {
                            state: "result" as const,
                            step: stepCount,
                            toolCallId: contentPart.toolCallId,
                            toolName: contentPart.toolName,
                            args: contentPart.args,
                            result: toolResult,
                          };

                          parts.push({
                            type: "tool-invocation",
                            toolInvocation,
                          });
                          stepCount++;
                        } else if (contentPart.type === "reasoning") {
                          const reasoningContentPart = contentPart as {
                            text: string;
                            signature?: string;
                          };
                          parts.push({
                            type: "reasoning",
                            reasoning: reasoningContentPart.text,
                            details: [
                              {
                                type: "text",
                                text: String(reasoningContentPart.text),
                                signature: reasoningContentPart.signature, // Store signature for Claude reasoning models
                              },
                            ],
                          });
                        }
                      }
                    }
                  }

                  const assistantMessage: Message = {
                    id: messageId,
                    role: "assistant" as const,
                    content: fullContent,
                    parts,
                  };

                  await saveAssistantMessageServer(
                    supabase,
                    assistantMessage,
                    finalSessionId,
                    user.id,
                    model,
                    modelConfig.provider,
                    { reasoningLevel, searchEnabled },
                    providerMetadata
                  );

                  messageSaved = true;
                } catch (error) {
                  console.error("Failed to save assistant message:", {
                    ...logContext,
                    error,
                  });
                }
              } else if (text) {
                // Fallback to simple text message if no response.messages
                try {
                  const assistantMessage: Message = {
                    id: messageId,
                    role: "assistant",
                    parts: [{ type: "text", text }],
                    content: text,
                  };

                  await saveAssistantMessageServer(
                    supabase,
                    assistantMessage,
                    finalSessionId,
                    user.id,
                    model,
                    modelConfig.provider,
                    { reasoningLevel, searchEnabled },
                    providerMetadata
                  );

                  messageSaved = true;
                  console.log("Message saved successfully with ID:", messageId);
                } catch (error) {
                  console.error("Failed to save assistant message:", {
                    ...logContext,
                    error,
                  });
                }
              }

              // Handle title generation for first message
              let generatedTitle: string | null = null;
              if (isFirstMessage && userMessageToSave) {
                try {
                  const firstUserMessage =
                    typeof userMessageToSave.content === "string"
                      ? userMessageToSave.content
                      : userMessageToSave.parts?.find((p) => p.type === "text")?.text || "";

                  generatedTitle = await generateTitleOnly(firstUserMessage);

                  // Update the title in the database using server-side client
                  const { error: titleError } = await supabase
                    .from("chat_sessions")
                    .update({ title: generatedTitle })
                    .eq("id", finalSessionId);

                  if (titleError) {
                    console.error("Failed to update title in database:", {
                      ...logContext,
                      error: titleError,
                    });
                  }
                } catch (error) {
                  console.error("Failed to generate title:", {
                    ...logContext,
                    error,
                  });
                }
              }

              // Send a SINGLE comprehensive annotation with all data batched together
              // This avoids the multi-annotation processing issues in AI SDK
              let finalModelName = model;
              if (
                reasoningLevel &&
                modelConfig?.reasoningLevels &&
                modelConfig.reasoningLevels.length > 0
              ) {
                finalModelName = `${model} (${reasoningLevel})`;
              }

              const annotationData = {
                type: "message_complete",
                data: {
                  // Model metadata
                  modelUsed: finalModelName,
                  modelProvider: modelConfig.provider,

                  // Message saved data (only if successfully saved)
                  ...(messageSaved && {
                    databaseId: messageId,
                    sessionId: finalSessionId,
                    messageSaved: true,
                  }),

                  // Title data (only if generated successfully)
                  ...(generatedTitle && {
                    titleGenerated: generatedTitle,
                    userId: user.id,
                  }),

                  // Grounding data (only if available)
                  ...(providerMetadata?.google?.groundingMetadata && {
                    grounding: providerMetadata.google.groundingMetadata as JSONValue,
                    hasGrounding: true,
                  }),

                  // Additional metadata for debugging
                  isFirstMessage,
                  timestamp: new Date().toISOString(),
                } as JSONValue,
              };

              dataStream.writeMessageAnnotation(annotationData);
            },
            onError: ({ error }) => {
              // Log LLM-specific errors (not abort errors)
              handleStreamError(error, "LLMStream", {
                sessionId: finalSessionId,
                userId: user.id,
                model,
                streamId,
              });
            },
          });

          result.mergeIntoDataStream(dataStream, {
            sendReasoning: modelConfig.capabilities.includes("reasoning"),
            sendSources: modelConfig.capabilities.includes("search") || searchEnabled,
          });
        },
        onError: (error: unknown) => {
          return handleStreamError(error, "DataStream", {
            sessionId: finalSessionId,
            userId: user.id,
            model,
          });
        },
      });
      return new Response(await streamContext.resumableStream(streamId, () => stream), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // This should never happen since Redis is always configured
    throw new Error("Redis not configured - this should not happen");
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return getErrorResponse(err, {
      body: req.body,
      headers: req.headers,
    });
  }
}
