import { ReasoningLevel } from "@/config/models";
import { type ChatMessage } from "@/services/chat-messages";
import { type ProviderMetadata } from "@/types/provider-metadata";
import { type Json } from "@/types/supabase-types";
import { type ModelMessage } from "ai";
import { v4 as uuidv4 } from "uuid";

/**
 * Prepare a message for database storage using AI SDK native format
 * Since our database schema matches AI SDK structure, minimal conversion is needed
 */
export function prepareMessageForDb({
  message,
  sessionId,
  userId,
  model,
  modelProvider,
  reasoningLevel,
  searchEnabled,
  providerMetadata,
}: {
  message: ModelMessage;
  sessionId: string;
  userId: string;
  model?: string;
  modelProvider?: string;
  reasoningLevel?: ReasoningLevel;
  searchEnabled?: boolean;
  providerMetadata?: ProviderMetadata;
}): Omit<ChatMessage, "created_at"> {
  const messageId = uuidv4();

  // Build model config if provided
  const modelConfig =
    reasoningLevel || searchEnabled !== undefined
      ? {
          ...(reasoningLevel && { reasoningLevel }),
          ...(searchEnabled !== undefined && { searchEnabled }),
        }
      : null;

  // Store the message in AI SDK native format - minimal conversion needed
  // The AI SDK message format matches our database schema
  return {
    id: messageId,
    session_id: sessionId,
    user_id: userId,
    role: message.role,
    content: typeof message.content === "string" ? message.content : null,
    parts: JSON.parse(JSON.stringify(message.content || [])),
    model_used: model || null,
    model_provider: modelProvider || null,
    model_config: modelConfig,
    metadata: JSON.parse(JSON.stringify(providerMetadata || {})) as Json,
  };
}
