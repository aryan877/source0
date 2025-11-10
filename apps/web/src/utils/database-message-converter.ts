import { ReasoningLevel } from "@/config/models";
import { type ProviderMetadata } from "@/types/provider-metadata";
import { type Json, type Tables } from "@/types/supabase-types";
import { type UIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";

/**
 * Prepare a UIMessage for database storage.
 * Simplified for AI SDK v5 - only handles UIMessage objects since that's all we use.
 */
export function prepareMessageForDb({
  message,
  sessionId,
  userId,
  model,
  modelProvider,
  reasoningLevel,
  searchEnabled,
  imageGenerationEnabled,
  providerMetadata,
}: {
  message: UIMessage;
  sessionId: string;
  userId: string;
  model?: string;
  modelProvider?: string;
  reasoningLevel?: ReasoningLevel;
  searchEnabled?: boolean;
  imageGenerationEnabled?: boolean;
  providerMetadata?: ProviderMetadata;
}): Omit<Tables<"chat_messages">, "updated_at"> {
  // Always generate a new UUID for database consistency
  // Database requires UUID format, not short IDs
  const messageId = uuidv4();

  const modelConfig = {
    ...(reasoningLevel && { reasoningLevel }),
    ...(searchEnabled !== undefined && { searchEnabled }),
    ...(imageGenerationEnabled !== undefined && { imageGenerationEnabled }),
  };

  // In AI SDK v5, all content is stored in parts
  const parts = message.parts || [];

  // Legacy content field - extract text from parts for backward compatibility
  const textParts = parts.filter((part) => part.type === "text");
  const content = textParts.length > 0 ? textParts.map((part) => part.text).join(" ") : null;

  // Combine message metadata with provider metadata
  // Message metadata (from AI SDK) takes precedence over provider metadata
  const combinedMetadata = {
    // Provider metadata (grounding, safety ratings, etc.)
    ...(providerMetadata || {}),
    // Message metadata (tokens, model info, etc.) - takes precedence
    ...(message.metadata || {}),
  };

  return {
    id: messageId,
    session_id: sessionId,
    user_id: userId,
    role: message.role,
    content,
    parts: parts as Json,
    model_used: model || null,
    model_provider: modelProvider || null,
    model_config: modelConfig as Json,
    metadata: combinedMetadata as Json,
    // Explicitly set created_at to ensure consistent ordering
    // especially important when saving user and assistant messages close together
    created_at: new Date().toISOString(),
  };
}
