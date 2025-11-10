import { type CustomUIMessage } from "@/types/custom-ui-message";
import { type Tables } from "@/types/supabase-types";

/**
 * Converts a single DBChatMessage to a CustomUIMessage with full metadata.
 * This is the reusable conversion function used across the app.
 */
export function toCustomUIMessage(dbMessage: Tables<"chat_messages">): CustomUIMessage {
  // Parse metadata column
  const metadataFromColumn =
    dbMessage.metadata && typeof dbMessage.metadata === "object"
      ? (dbMessage.metadata as Record<string, unknown>)
      : {};

  // Parse model config
  const modelConfigData =
    dbMessage.model_config && typeof dbMessage.model_config === "object"
      ? {
          reasoningLevel: (dbMessage.model_config as Record<string, unknown>).reasoningLevel as
            | "low"
            | "medium"
            | "high"
            | undefined,
          searchEnabled: (dbMessage.model_config as Record<string, unknown>).searchEnabled as
            | boolean
            | undefined,
        }
      : {};

  // Combine all metadata, with metadata column taking precedence for tokens
  const combinedMetadata = {
    // Model info from dedicated columns (fallback)
    model: dbMessage.model_used || undefined,
    modelProvider: dbMessage.model_provider || undefined,
    // Config from model_config column
    ...modelConfigData,
    // Provider metadata (tokens, timestamps, etc.) from metadata column - this should override
    ...metadataFromColumn,
  };

  return {
    id: dbMessage.id,
    role: dbMessage.role as "user" | "assistant" | "system",
    parts: (dbMessage.parts as CustomUIMessage["parts"]) || [],
    metadata: combinedMetadata,
  };
}

/**
 * Converts database messages to UI messages, ensuring parts are correctly typed.
 * @deprecated Use toCustomUIMessage directly for single messages or map over arrays
 */
export function convertDbMessagesToUiMessages(
  dbMessages: Tables<"chat_messages">[]
): CustomUIMessage[] {
  return dbMessages.map((msg) => toCustomUIMessage(msg));
}
