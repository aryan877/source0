import { ReasoningLevel } from "@/config/models";
import { type Json, type Tables } from "@/types/supabase-types";
import { prepareMessageForDb } from "@/utils/message-utils";
import { createClient } from "@/utils/supabase/client";
import { type Message } from "ai";

// Types
export type DBChatMessage = Tables<"chat_messages">;

export interface ReasoningDetail {
  type: "text";
  text: string;
  signature?: string;
}

// Specific type for the 'parts' JSONB column, for strong typing in app code
export interface MessagePart {
  type: "text" | "file" | "tool-invocation" | "tool-result" | "reasoning";
  text?: string;
  file?: {
    name: string;
    path: string;
    url: string;
    size: number;
    mimeType: string;
  };
  toolInvocation?: Record<string, unknown>;
  toolResult?: Record<string, unknown>;
  reasoning?: string;
  details?: ReasoningDetail[];
}

// App-level ChatMessage type with strongly-typed 'parts' and 'role'
export type ChatMessage = Omit<DBChatMessage, "parts" | "role" | "created_at"> & {
  role: "user" | "assistant" | "system" | "tool";
  parts: MessagePart[];
  created_at: string;
};

/**
 * Add a message to the database
 */
export async function addMessage(message: Omit<ChatMessage, "created_at">): Promise<DBChatMessage> {
  const supabase = createClient();
  const { data, error } = await supabase.from("chat_messages").upsert(message).select().single();

  if (error) {
    console.error("Error upserting message:", error);
    throw new Error(`Failed to upsert message: ${error.message}`);
  }
  return data;
}

/**
 * Get all messages for a session
 */
export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
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

  // Cast the untyped 'parts' and 'role' from the DB to our specific app types
  return data as ChatMessage[];
}

/**
 * Get a specific message by ID
 */
export async function getMessage(messageId: string): Promise<ChatMessage | null> {
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

  return data as ChatMessage;
}

/**
 * Delete a specific message
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);

  if (error) {
    console.error(`Error deleting message ${messageId}:`, error);
    // It's better to not throw here to avoid crashing the UI on a failed delete.
    // The UI can handle the retry logic.
  }
}

/**
 * Simple retry function: Delete from a message onwards
 */
export async function deleteFromPoint(messageId: string): Promise<boolean> {
  const supabase = createClient();

  // First, get the message info
  const { data: message, error: fetchError } = await supabase
    .from("chat_messages")
    .select("session_id, created_at")
    .eq("id", messageId)
    .maybeSingle();

  if (fetchError || !message) {
    console.error(`Error fetching message ${messageId} for retry:`, fetchError?.message);
    return false;
  }

  // Delete everything from this point onwards
  const { error: deleteError } = await supabase
    .from("chat_messages")
    .delete()
    .eq("session_id", message.session_id)
    .gte("created_at", message.created_at);

  if (deleteError) {
    console.error(`Error deleting messages from retry point:`, deleteError.message);
    return false;
  }

  return true;
}

/**
 * Get messages by model provider
 */
export async function getMessagesByProvider(
  sessionId: string,
  provider: string
): Promise<ChatMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .eq("model_provider", provider)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error fetching messages by provider ${provider}:`, error);
    return [];
  }

  return data as ChatMessage[];
}

/**
 * Get messages by model
 */
export async function getMessagesByModel(sessionId: string, model: string): Promise<ChatMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .eq("model_used", model)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error fetching messages by model ${model}:`, error);
    return [];
  }

  return data as ChatMessage[];
}

/**
 * Get messages by role
 */
export async function getMessagesByRole(
  sessionId: string,
  role: "user" | "assistant" | "system" | "tool"
): Promise<ChatMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .eq("role", role)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error fetching messages by role ${role}:`, error);
    return [];
  }

  return data as ChatMessage[];
}

/**
 * Update message metadata
 */
export async function updateMessageMetadata(messageId: string, metadata: Json): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chat_messages").update({ metadata }).eq("id", messageId);

  if (error) {
    console.error(`Error updating message metadata for ${messageId}:`, error);
    throw new Error(`Failed to update message metadata: ${error.message}`);
  }
}

/**
 * Update message parts
 */
export async function updateMessageParts(messageId: string, parts: MessagePart[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chat_messages").update({ parts }).eq("id", messageId);

  if (error) {
    console.error(`Error updating message parts for ${messageId}:`, error);
    throw new Error(`Failed to update message parts: ${error.message}`);
  }
}

/**
 * Search messages by content
 */
export async function searchMessages(
  sessionId: string,
  searchQuery: string
): Promise<ChatMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .textSearch("parts", searchQuery)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error searching messages:`, error);
    return [];
  }

  return data as ChatMessage[];
}

/**
 * Get message statistics for a session
 */
export async function getMessageStats(sessionId: string): Promise<{
  total: number;
  byRole: Record<string, number>;
  byProvider: Record<string, number>;
}> {
  const messages = await getMessages(sessionId);

  const stats = {
    total: messages.length,
    byRole: {} as Record<string, number>,
    byProvider: {} as Record<string, number>,
  };

  messages.forEach((message) => {
    // Count by role
    stats.byRole[message.role] = (stats.byRole[message.role] || 0) + 1;

    // Count by provider (only for assistant messages)
    if (message.role === "assistant" && message.model_provider) {
      stats.byProvider[message.model_provider] =
        (stats.byProvider[message.model_provider] || 0) + 1;
    }
  });

  return stats;
}

/**
 * Client-side function to save a user message.
 * It uses the new `prepareMessageForDb` helper.
 */
export async function saveUserMessage(
  userMessage: Message,
  sessionId: string,
  userId: string
): Promise<DBChatMessage> {
  const preparedMessage = prepareMessageForDb({
    message: userMessage,
    sessionId,
    userId,
  });
  return addMessage(preparedMessage);
}

/**
 * Client-side function to save an assistant message, often partially.
 * It uses the new `prepareMessageForDb` helper.
 */
export async function saveAssistantMessage(
  message: Message,
  sessionId: string,
  userId: string,
  model: string,
  modelProvider: string,
  modelConfig: { reasoningLevel?: string; searchEnabled?: boolean },
  options: { fireAndForget?: boolean; existingParts?: MessagePart[] } = {}
): Promise<DBChatMessage | void> {
  const preparedMessage = prepareMessageForDb({
    message,
    sessionId,
    userId,
    model,
    modelProvider,
    reasoningLevel: modelConfig.reasoningLevel as ReasoningLevel,
    searchEnabled: modelConfig.searchEnabled,
    existingParts: options.existingParts,
  });

  if (options.fireAndForget) {
    addMessage(preparedMessage).catch((error) => {
      console.error("Fire-and-forget saveAssistantMessage failed:", error);
    });
    return;
  }
  return addMessage(preparedMessage);
}
