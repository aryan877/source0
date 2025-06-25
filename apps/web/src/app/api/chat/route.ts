import { getModelById, type ReasoningLevel } from "@/config/models";
import { getMessages } from "@/services/chat-messages";
import { saveAssistantMessageServer, saveUserMessageServer } from "@/services/chat-messages.server";
import { createOrGetSession } from "@/services/chat-sessions.server";
import {
  serverAppendStreamId,
  serverGetLatestStreamIdWithStatus,
  serverMarkStreamAsCancelled,
  serverMarkStreamAsComplete,
} from "@/services/chat-streams";
import { generateTitleOnly } from "@/services/generate-chat-title";
import { getActiveMcpServersForUser } from "@/services/mcp-servers.server";
import { saveMessageSummary } from "@/services/message-summaries";
import { saveModelUsageLog } from "@/services/usage-logs.server";
import { processMessages } from "@/utils/core-message-processor";
import { convertToAiMessages } from "@/utils/database-message-converter";
import { pub, sub } from "@/utils/redis";
import { createClient } from "@/utils/supabase/server";
import { openai } from "@ai-sdk/openai";
import { createDataStream, generateObject, streamText, type JSONValue, type Message } from "ai";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream/ioredis";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { createErrorResponse, getErrorResponse, handleStreamError } from "./utils/errors";
import { handleImageGenerationRequest } from "./utils/image-generation";
import { discoverMcpTools } from "./utils/mcp-tools";
import {
  buildProviderOptions,
  buildSystemMessage,
  createModelInstance,
  getModelMapping,
} from "./utils/models";
import { getToolsForModel } from "./utils/tools";

const MessageSummarySchema = z.object({
  summary: z
    .string()
    .describe(
      "A very short, concise summary (5-10 words) of the following message content. Capture the core essence of the message."
    ),
});

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
  showChatNavigator?: boolean;
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

  if (latestStream.cancelled || latestStream.complete) {
    console.log(
      `Stream ${latestStream.streamId} was cancelled or completed, not resuming (cancelled: ${latestStream.cancelled}, complete: ${latestStream.complete})`
    );
    return new Response(null, { status: 204 }); // Stream was cancelled or completed, don't resume
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
      showChatNavigator = false,
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

    // Fetch active MCP servers and discover their tools
    const mcpServerList = await getActiveMcpServersForUser(user.id);
    const { tools: consolidatedMcpTools, errors: mcpConnectionErrors } =
      await discoverMcpTools(mcpServerList);

    if (mcpConnectionErrors.length > 0) {
      const errorDetails = mcpConnectionErrors
        .map(({ serverName, message }) => `- ${serverName}: ${message}`)
        .join("\n");
      const errorMessage = `[MCP Connection Error] Failed to connect to the following tool servers:\n${errorDetails}\n\nPlease check your MCP server configurations in Settings > MCP Servers.`;
      return createErrorResponse(errorMessage, 500, "MCP_CONNECTION_ERROR");
    }

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
      const savedUserMessage = await saveUserMessageServer(
        supabase,
        userMessageToSave,
        finalSessionId,
        user.id
      );

      if (showChatNavigator) {
        try {
          const userMessageContent =
            typeof userMessageToSave.content === "string"
              ? userMessageToSave.content
              : userMessageToSave.parts?.map((p) => (p.type === "text" ? p.text : "")).join("\n") ||
                "";

          if (userMessageContent) {
            const { object } = await generateObject({
              model: openai("gpt-4o-mini"),
              schema: MessageSummarySchema,
              prompt: `Generate a very short, concise summary (5-10 words) of the following message content. Capture the core essence of the message.\n\nMessage Content:\n---\n${userMessageContent}\n---`,
            });
            await saveMessageSummary(supabase, {
              message_id: savedUserMessage.id,
              session_id: finalSessionId,
              user_id: user.id,
              summary: object.summary,
            });
          }
        } catch (e) {
          console.error("Failed to generate/save user message summary", e);
        }
      }
    }

    if (modelConfig.capabilities.includes("image-generation")) {
      const lastUserMessage = messages[messages.length - 1];
      const prompt = typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "";

      // Extract any image attachments from the last user message
      const imageAttachments = (lastUserMessage?.experimental_attachments || []).filter((att) =>
        att.contentType?.startsWith("image/")
      );

      return handleImageGenerationRequest(
        supabase,
        user,
        finalSessionId,
        modelConfig,
        prompt,
        imageAttachments
      );
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
        async execute(dataStream) {
          const abortController = new AbortController();
          const signal = abortController.signal;

          // This is guaranteed to be defined by the streamContext check
          const redisSubscriber = sub!.duplicate();
          const channel = `chat-cancel-${streamId}`;

          const cleanup = () => {
            redisSubscriber
              .unsubscribe(channel)
              .catch((e) => console.error("Error unsubscribing", e));
            redisSubscriber.quit().catch((e) => console.error("Error quitting subscriber", e));
          };

          try {
            // Wait for the subscription to be confirmed before proceeding.
            await new Promise<void>((resolve, reject) => {
              redisSubscriber.on("error", (err) => {
                console.error("Redis Subscriber Error", err);
                reject(err);
              });
              redisSubscriber.subscribe(channel, (err) => {
                if (err) {
                  return reject(
                    new Error(`Failed to subscribe to cancellation channel: ${err.message}`)
                  );
                }
                resolve();
              });
            });

            redisSubscriber.on("message", (ch, message) => {
              if (ch === channel && message === "cancel") {
                console.log(`Cancellation signal received for stream ${streamId}. Aborting...`);
                abortController.abort();
              }
            });

            console.log("Starting streamText for session:", {
              sessionId: finalSessionId,
              userId: user.id,
              model,
              streamId,
              messageCount: finalMessages.length,
            });

            const result = streamText({
              model: modelInstance,
              messages: finalMessages,
              maxSteps: 5,
              tools: getToolsForModel(user.id, searchEnabled, memoryEnabled, consolidatedMcpTools, {
                capabilities: modelConfig.capabilities,
                supportsFunctions: modelConfig.supportsFunctions,
              }),
              abortSignal: signal,
              ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
              onFinish: async ({ text, providerMetadata, response, usage }) => {
                console.log("streamText completed for session:", {
                  sessionId: finalSessionId,
                  userId: user.id,
                  model,
                  streamId,
                  textLength: text.length,
                });

                try {
                  await saveModelUsageLog(supabase, {
                    user_id: user.id,
                    session_id: finalSessionId,
                    model_id: model,
                    provider: modelConfig.provider,
                    prompt_tokens: usage.promptTokens,
                    completion_tokens: usage.completionTokens,
                    total_tokens: usage.totalTokens,
                  });
                } catch (e) {
                  console.error("Failed to save model usage log", e);
                }

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
                              if (
                                toolMessage.role === "tool" &&
                                Array.isArray(toolMessage.content)
                              ) {
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

                    const savedAssistantMessage = await saveAssistantMessageServer(
                      supabase,
                      assistantMessage,
                      finalSessionId,
                      user.id,
                      model,
                      modelConfig.provider,
                      { reasoningLevel, searchEnabled },
                      providerMetadata
                    );

                    if (showChatNavigator && assistantMessage.content) {
                      try {
                        const { object } = await generateObject({
                          model: openai("gpt-4o-mini"),
                          schema: MessageSummarySchema,
                          prompt: `Generate a very short, concise summary (5-10 words) of the following message content. Capture the core essence of the message.\n\nMessage Content:\n---\n${assistantMessage.content}\n---`,
                        });
                        await saveMessageSummary(supabase, {
                          message_id: savedAssistantMessage.id,
                          session_id: finalSessionId,
                          user_id: user.id,
                          summary: object.summary,
                        });
                      } catch (e) {
                        console.error("Failed to generate/save assistant message summary", e);
                      }
                    }

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

                    const savedAssistantMessage = await saveAssistantMessageServer(
                      supabase,
                      assistantMessage,
                      finalSessionId,
                      user.id,
                      model,
                      modelConfig.provider,
                      { reasoningLevel, searchEnabled },
                      providerMetadata
                    );

                    if (showChatNavigator && assistantMessage.content) {
                      try {
                        const { object } = await generateObject({
                          model: openai("gpt-4o-mini"),
                          schema: MessageSummarySchema,
                          prompt: `Generate a very short, concise summary (5-10 words) of the following message content. Capture the core essence of the message.\n\nMessage Content:\n---\n${assistantMessage.content}\n---`,
                        });
                        await saveMessageSummary(supabase, {
                          message_id: savedAssistantMessage.id,
                          session_id: finalSessionId,
                          user_id: user.id,
                          summary: object.summary,
                        });
                      } catch (e) {
                        console.error("Failed to generate/save assistant message summary", e);
                      }
                    }

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

                try {
                  await serverMarkStreamAsComplete(supabase, streamId);
                } catch (e) {
                  console.error("Failed to mark stream as complete", { ...logContext, error: e });
                }
              },
            });

            result.mergeIntoDataStream(dataStream, {
              sendReasoning: modelConfig.capabilities.includes("reasoning"),
              sendSources: modelConfig.capabilities.includes("search") || searchEnabled,
            });

            // Consume the stream to ensure it runs to completion & triggers onFinish
            // even when the client response is aborted:
            await result.consumeStream();
          } catch (error) {
            if ((error as Error).name !== "AbortError") {
              // Re-throw the error to be caught by the data stream's onError
              throw error;
            }
            // Do not re-throw AbortError, as it's an expected part of the flow
          } finally {
            cleanup();
          }
        },
        onError: (error: unknown) => {
          // This is the single point of truth for handling stream errors and reporting to the client.
          const isAbortError = (error as Error)?.name === "AbortError";

          // Also mark stream as cancelled on error, unless it's a client-side abort.
          if (!isAbortError) {
            serverMarkStreamAsCancelled(supabase, streamId).catch((e) => {
              console.error("Failed to mark stream as cancelled on error", { streamId, error: e });
            });
          }

          // Don't log abort errors as they are expected client-side behavior (e.g., user stops generation)
          if (!isAbortError) {
            console.error("createDataStream error:", {
              sessionId: finalSessionId,
              userId: user.id,
              model,
              streamId,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            });

            handleStreamError(error, "DataStream", {
              sessionId: finalSessionId,
              userId: user.id,
              model,
              streamId,
            });
          }

          return error instanceof Error ? error.message : "An error occurred during streaming";
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
