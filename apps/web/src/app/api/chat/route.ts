import { type ReasoningLevel } from "@/config/models";
import { createDataStreamResponse, streamText, type Message } from "ai";
import { createOrGetSession, getAuthenticatedUser, saveUserMessage } from "./utils/database";
import { createErrorResponse, getErrorResponse, handleStreamError } from "./utils/errors";
import { processMessages } from "./utils/messages";
import {
  buildProviderOptions,
  buildSystemMessage,
  createModelInstance,
  getModelById,
  getModelMapping,
} from "./utils/models";
import { createStreamHandlers } from "./utils/stream-handlers";

export const maxDuration = 30;

interface ChatRequest {
  messages: Message[];
  model?: string;
  reasoningLevel?: ReasoningLevel;
  searchEnabled?: boolean;
  id?: string;
}

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

    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResponse("User not authenticated", 401, "AUTH_ERROR");
    }

    const { sessionId: currentSessionId, isNewSession } = await createOrGetSession(
      supabase,
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
      await saveUserMessage(supabase, userMessageToSave, currentSessionId, user.id);
    }

    const systemMessage = buildSystemMessage(modelConfig, searchEnabled);
    const finalMessages = [{ role: "system" as const, content: systemMessage }, ...coreMessages];

    const modelInstance = createModelInstance(modelConfig, mapping, searchEnabled);
    const providerOptions = buildProviderOptions(modelConfig, reasoningLevel);

    return createDataStreamResponse({
      execute: (dataStream) => {
        const streamHandlers = createStreamHandlers(
          supabase,
          currentSessionId,
          user.id,
          model,
          modelConfig,
          reasoningLevel,
          searchEnabled,
          isNewSession,
          messages
        );

        const result = streamText({
          model: modelInstance,
          messages: finalMessages,
          maxSteps: 5,
          ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
          onFinish: (finishResult) => streamHandlers.onFinish(finishResult, dataStream),
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
