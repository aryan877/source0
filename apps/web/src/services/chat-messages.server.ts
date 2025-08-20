import { ReasoningLevel } from "@/config/models";
import { type ProviderMetadata } from "@/types/provider-metadata";
import { prepareMessageForDb } from "@/utils/database-message-converter";
import { createClient } from "@/utils/supabase/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { type CustomUIMessage } from "@/types/custom-ui-message";
import { toCustomUIMessage } from "@/app/api/chat/utils/message-conversion";
import { type DBChatMessage } from "./chat-messages";


/**
 * Adds a prepared message to the database.
 */
async function addMessageServer(
  supabase: SupabaseClient,
  message: ReturnType<typeof prepareMessageForDb>
): Promise<DBChatMessage> {
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
  supabase: SupabaseClient,
  userMessage: CustomUIMessage,
  sessionId: string,
  userId: string
): Promise<DBChatMessage> {
  const preparedMessage = prepareMessageForDb({
    message: userMessage,
    sessionId,
    userId,
  });
  return addMessageServer(supabase, preparedMessage);
}

/**
 * Server-side function to save an assistant message.
 */
export async function saveAssistantMessageServer(
  supabase: SupabaseClient,
  message: CustomUIMessage,
  sessionId: string,
  userId: string,
  model: string,
  modelProvider: string,
  modelConfig: { reasoningLevel?: string; searchEnabled?: boolean; imageGenerationEnabled?: boolean },
  providerMetadata?: ProviderMetadata
): Promise<DBChatMessage> {
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
  return addMessageServer(supabase, preparedMessage);
}

/**
 * Server-side function to save a tool message.
 */
export async function saveToolMessageServer(
  supabase: SupabaseClient,
  message: CustomUIMessage,
  sessionId: string,
  userId: string
): Promise<DBChatMessage> {
  const preparedMessage = prepareMessageForDb({
    message,
    sessionId,
    userId,
  });
  return addMessageServer(supabase, preparedMessage);
}

/**
 * Get all messages for a session as CustomUIMessages (server-side version).
 */
export async function getMessagesServer(sessionId: string): Promise<CustomUIMessage[]> {
  if (!sessionId || sessionId === "new") {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return data.map(toCustomUIMessage);
}
