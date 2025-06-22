import { ReasoningLevel } from "@/config/models";
import { type ProviderMetadata } from "@/types/provider-metadata";
import { convertToAiMessages, prepareMessageForDb } from "@/utils/message-utils";
import { createClient } from "@/utils/supabase/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { type Message } from "ai";
import { type ChatMessage, type DBChatMessage } from "./chat-messages";

/**
 * Server-side function to save a user message.
 * It uses the new `prepareMessageForDb` helper.
 */
export async function saveUserMessageServer(
  supabase: SupabaseClient,
  userMessage: Message,
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
 * It uses the new `prepareMessageForDb` helper.
 */
export async function saveAssistantMessageServer(
  supabase: SupabaseClient,
  message: Message,
  sessionId: string,
  userId: string,
  model: string,
  modelProvider: string,
  modelConfig: { reasoningLevel?: string; searchEnabled?: boolean },
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
    providerMetadata,
  });
  return addMessageServer(supabase, preparedMessage);
}

/**
 * Add a message to the database (server-side version)
 */
export async function addMessageServer(
  supabase: SupabaseClient,
  message: Omit<ChatMessage, "created_at">
): Promise<DBChatMessage> {
  const { data, error } = await supabase.from("chat_messages").upsert(message).select().single();

  if (error) {
    console.error("Error upserting message:", error);
    throw new Error(`Failed to upsert message: ${error.message}`);
  }
  return data;
}

/**
 * Get all messages for a session (server-side version)
 */
export async function getMessagesServer(sessionId: string): Promise<Message[]> {
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

  // Cast the untyped 'parts' and 'role' from the DB to our specific app types
  const chatMessages = data as ChatMessage[];

  // Convert ChatMessage[] to Message[] for the AI SDK
  return convertToAiMessages(chatMessages);
}
