import { toCustomUIMessage } from "@/app/api/chat/utils/message-conversion";
import { ReasoningLevel } from "@/config/models";
import { type CustomUIMessage } from "@/types/custom-ui-message";
import { type Json, type Tables } from "@/types/supabase-types";
import { prepareMessageForDb } from "@/utils/database-message-converter";
import { createClient } from "@/utils/supabase/client";

export type DBChatMessage = Tables<"chat_messages">;

/**
 * Adds a UIMessage to the database.
 */
async function addMessage(
  message: CustomUIMessage,
  sessionId: string,
  userId: string
): Promise<DBChatMessage> {
  const supabase = createClient();
  const preparedMessage = prepareMessageForDb({ message, sessionId, userId });
  const { data, error } = await supabase
    .from("chat_messages")
    .upsert(preparedMessage)
    .select()
    .single();

  if (error) {
    console.error("Error upserting message:", error);
    throw new Error(`Failed to upsert message: ${error.message}`);
  }
  return data;
}

/**
 * Get all messages for a session as CustomUIMessages with full metadata.
 */
export async function getMessages(sessionId: string): Promise<CustomUIMessage[]> {
  if (!sessionId || sessionId === "new") {
    return [];
  }

  const supabase = createClient();
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

/**
 * Get a specific message by ID as a CustomUIMessage.
 */
export async function getMessage(messageId: string): Promise<CustomUIMessage | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("id", messageId)
    .single();

  if (error) {
    console.error(`Error fetching message ${messageId}:`, error);
    return null;
  }

  return toCustomUIMessage(data);
}

/**
 * Deletes a specific message.
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);
  if (error) {
    console.error(`Error deleting message ${messageId}:`, error);
  }
}

/**
 * Deletes all messages in a session from a certain point onwards.
 */
export async function deleteFromPoint(
  messageId: string,
  inclusive: boolean = false
): Promise<boolean> {
  const supabase = createClient();
  const { data: message, error: fetchError } = await supabase
    .from("chat_messages")
    .select("session_id, created_at")
    .eq("id", messageId)
    .maybeSingle();

  if (fetchError || !message) {
    console.error(`Error fetching message ${messageId} for retry:`, fetchError?.message);
    return false;
  }

  let query = supabase.from("chat_messages").delete().eq("session_id", message.session_id);
  query = inclusive
    ? query.gte("created_at", message.created_at)
    : query.gt("created_at", message.created_at);

  const { error: deleteError } = await query;
  if (deleteError) {
    console.error(`Error deleting messages from retry point:`, deleteError.message);
    return false;
  }
  return true;
}

/**
 * Updates the parts of a specific message.
 */
export async function updateMessageParts(
  messageId: string,
  parts: CustomUIMessage["parts"]
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("chat_messages")
    .update({ parts: parts as Json })
    .eq("id", messageId);
  if (error) {
    console.error(`Error updating message parts for ${messageId}:`, error);
    throw new Error(`Failed to update message parts: ${error.message}`);
  }
}

/**
 * Saves a user's message.
 */
export async function saveUserMessage(
  userMessage: CustomUIMessage,
  sessionId: string,
  userId: string
): Promise<DBChatMessage> {
  return addMessage(userMessage, sessionId, userId);
}

/**
 * Saves an assistant's message.
 */
export async function saveAssistantMessage(
  message: CustomUIMessage,
  sessionId: string,
  userId: string,
  model: string,
  modelProvider: string,
  modelConfig: { reasoningLevel?: string; searchEnabled?: boolean; imageGenerationEnabled?: boolean },
  options: { fireAndForget?: boolean } = {}
): Promise<DBChatMessage | void> {
  const preparedMessage = prepareMessageForDb({
    message,
    sessionId,
    userId,
    model,
    modelProvider,
    reasoningLevel: modelConfig.reasoningLevel as ReasoningLevel,
    searchEnabled: modelConfig.searchEnabled,
    imageGenerationEnabled: modelConfig.imageGenerationEnabled,
  });

  const supabase = createClient();
  const promise = supabase.from("chat_messages").upsert(preparedMessage).select().single();

  if (options.fireAndForget) {
    promise.then(({ error }) => {
      if (error) console.error("Fire-and-forget saveAssistantMessage failed:", error);
    });
    return;
  }

  const { data, error } = await promise;
  if (error) {
    console.error("Error saving assistant message:", error);
    throw new Error(error.message);
  }
  return data;
}
