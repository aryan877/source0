import { toCustomUIMessage } from "@/app/api/chat/utils/message-conversion";
import { ReasoningLevel } from "@/config/models";
import { type CustomUIMessage } from "@/types/custom-ui-message";
import { prepareMessageForDb } from "@/utils/database-message-converter";
import { createClient } from "@/utils/supabase/client";

/**
 * Adds a UIMessage to the database.
 */
async function addMessage(
  message: CustomUIMessage,
  sessionId: string,
  userId: string
) {
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
export async function getMessages(sessionId: string) {
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
 * Deletes a specific message.
 */
export async function deleteMessage(messageId: string) {
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
) {
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
 * Saves a user's message.
 */
export async function saveUserMessage(
  userMessage: CustomUIMessage,
  sessionId: string,
  userId: string
) {
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
