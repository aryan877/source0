import { ReasoningLevel } from "@/config/models";
import { type ProviderMetadata } from "@/types/provider-metadata";
import { prepareMessageForDb } from "@/utils/database-message-converter";
import { createClient } from "@/utils/supabase/server";
import { type CustomUIMessage } from "@/types/custom-ui-message";

/**
 * Adds a prepared message to the database.
 */
async function addMessageServer(
  message: ReturnType<typeof prepareMessageForDb>
) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("chat_messages").upsert(message).select().single();
  if (error) {
    console.error("Error upserting message:", error);
    throw new Error(`Failed to upsert message: ${error.message}`);
  }
  return data;
}

/**
 * Server-side function to save a user message.
 */
export async function saveUserMessageServer(
  userMessage: CustomUIMessage,
  sessionId: string,
  userId: string
) {
  const preparedMessage = prepareMessageForDb({
    message: userMessage,
    sessionId,
    userId,
  });
  return addMessageServer(preparedMessage);
}

/**
 * Server-side function to save an assistant message.
 */
export async function saveAssistantMessageServer(
  message: CustomUIMessage,
  sessionId: string,
  userId: string,
  model: string,
  modelProvider: string,
  modelConfig: { reasoningLevel?: string; searchEnabled?: boolean; imageGenerationEnabled?: boolean },
  providerMetadata?: ProviderMetadata
) {
  const preparedMessage = prepareMessageForDb({
    message,
    sessionId,
    userId,
    model,
    modelProvider,
    reasoningLevel: modelConfig.reasoningLevel as ReasoningLevel,
    searchEnabled: modelConfig.searchEnabled,
    imageGenerationEnabled: modelConfig.imageGenerationEnabled,
    providerMetadata,
  });
  return addMessageServer(preparedMessage);
}

