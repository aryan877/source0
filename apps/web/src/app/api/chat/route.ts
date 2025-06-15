import { type ReasoningLevel } from "@/config/models";
import {
  createOrGetSession,
  generateChatTitle,
  getMessages,
  saveAssistantMessageServer,
  saveUserMessageServer,
  serverAppendStreamId,
  serverLoadStreamIds,
} from "@/services";
import { type GoogleProviderMetadata, type ProviderMetadata } from "@/types/google-metadata";
import { convertToAiMessages } from "@/utils/message-utils";
import { pub, sub } from "@/utils/redis";
import { createClient } from "@/utils/supabase/server";
import {
  createDataStream,
  createDataStreamResponse,
  streamText,
  type JSONValue,
  type Message,
} from "ai";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream/ioredis";
import { inspect } from "util";
import { v4 as uuidv4 } from "uuid";
import { createErrorResponse, getErrorResponse, handleStreamError } from "./utils/errors";
import { handleImageGenerationRequest } from "./utils/image-generation";
import { processMessages } from "./utils/messages";
import {
  buildProviderOptions,
  buildSystemMessage,
  createModelInstance,
  getModelById,
  getModelMapping,
} from "./utils/models";

export const maxDuration = 60;

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
  id?: string;
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

  const streamIds = await serverLoadStreamIds(supabase, chatId);

  if (streamIds.length === 0) {
    return new Response(null, { status: 204 }); // No streams to resume
  }

  const recentStreamId = streamIds.at(0); // most recent is first
  if (!recentStreamId) {
    return new Response(null, { status: 204 });
  }

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

const logGoogleMetadata = (
  providerMetadata: ProviderMetadata | undefined
): GoogleProviderMetadata["groundingMetadata"] | null => {
  const grounding = providerMetadata?.google?.groundingMetadata;
  if (grounding && process.env.NODE_ENV === "development") {
    console.log("Grounding:", {
      queries: grounding.webSearchQueries?.length ?? 0,
      chunks: grounding.groundingChunks?.length ?? 0,
      supports: grounding.groundingSupports?.length ?? 0,
    });
  }
  return grounding;
};

export async function POST(req: Request): Promise<Response> {
  try {
    const body: ChatRequest = await req.json();
    const {
      messages,
      model = "gemini-2.5-flash",
      reasoningLevel = "medium",
      searchEnabled = false,
      id: sessionId,
    } = body;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return createErrorResponse("User not authenticated", 401, "AUTH_ERROR");
    }

    const { sessionId: currentSessionId, isNewSession } = await createOrGetSession(
      user.id,
      sessionId
    );

    const modelConfig = getModelById(model);
    if (!modelConfig) {
      return createErrorResponse(`Model ${model} not found`, 400);
    }

    const mapping = getModelMapping(modelConfig);
    if (!mapping.supported) {
      return createErrorResponse(mapping.message, 400);
    }

    const { coreMessages, userMessageToSave } = await processMessages(messages, modelConfig);

    if (userMessageToSave) {
      await saveUserMessageServer(supabase, userMessageToSave, currentSessionId, user.id);
    }

    if (modelConfig.capabilities.includes("image-generation")) {
      const lastUserMessage = messages[messages.length - 1];
      const prompt = typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "";
      return handleImageGenerationRequest(supabase, user, currentSessionId, modelConfig, prompt);
    }

    const systemMessage = buildSystemMessage(modelConfig, searchEnabled);
    const finalMessages = [{ role: "system" as const, content: systemMessage }, ...coreMessages];

    const modelInstance = createModelInstance(modelConfig, mapping, searchEnabled);
    const providerOptions = buildProviderOptions(modelConfig, reasoningLevel);

    if (streamContext) {
      const streamId = uuidv4();
      await serverAppendStreamId(supabase, currentSessionId, streamId);

      console.log("finalMessages", inspect(finalMessages, { depth: null }));

      const stream = createDataStream({
        execute: (dataStream) => {
          const result = streamText({
            model: modelInstance,
            messages: finalMessages,
            maxSteps: 5,
            ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
            onFinish: async ({ text, providerMetadata, usage }) => {
              const messageId = uuidv4();

              if (text) {
                await saveAssistantMessageServer(
                  supabase,
                  messageId,
                  currentSessionId,
                  user.id,
                  [{ type: "text", text }],
                  model,
                  modelConfig.provider,
                  { reasoningLevel, searchEnabled, usage }
                );
              }

              dataStream.writeMessageAnnotation({
                type: "message_saved",
                data: { databaseId: messageId, sessionId: currentSessionId },
              });

              if (isNewSession) {
                await generateChatTitle(currentSessionId, messages);
              }

              const groundingMetadata = logGoogleMetadata(providerMetadata);
              if (groundingMetadata) {
                dataStream.writeMessageAnnotation({
                  type: "grounding",
                  data: groundingMetadata as JSONValue,
                });
              }
            },
            onError: ({ error }) =>
              console.error(
                "Stream error:",
                error instanceof Error ? error.message : String(error)
              ),
          });

          result.mergeIntoDataStream(dataStream, {
            sendReasoning: modelConfig.capabilities.includes("reasoning"),
            sendSources: modelConfig.capabilities.includes("search") || searchEnabled,
          });
        },
        onError: (error: unknown) => handleStreamError(error, "DataStream"),
      });
      return new Response(await streamContext.resumableStream(streamId, () => stream), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Fallback to non-resumable stream if Redis is not configured
    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: modelInstance,
          messages: finalMessages,
          maxSteps: 5,
          ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
          onFinish: async ({ text, providerMetadata, usage }) => {
            const messageId = uuidv4();

            if (text) {
              await saveAssistantMessageServer(
                supabase,
                messageId,
                currentSessionId,
                user.id,
                [{ type: "text", text }],
                model,
                modelConfig.provider,
                { reasoningLevel, searchEnabled, usage }
              );
            }

            dataStream.writeMessageAnnotation({
              type: "message_saved",
              data: { databaseId: messageId, sessionId: currentSessionId },
            });

            if (isNewSession) {
              await generateChatTitle(currentSessionId, messages);
            }

            const groundingMetadata = logGoogleMetadata(providerMetadata);
            if (groundingMetadata) {
              dataStream.writeMessageAnnotation({
                type: "grounding",
                data: groundingMetadata as JSONValue,
              });
            }
          },
          onError: ({ error }) =>
            console.error("Stream error:", error instanceof Error ? error.message : String(error)),
        });

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: modelConfig.capabilities.includes("reasoning"),
          sendSources: modelConfig.capabilities.includes("search") || searchEnabled,
        });
      },
      onError: (error: unknown) => handleStreamError(error, "DataStream"),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return getErrorResponse(err);
  }
}
