import { type Json, type Tables } from "@/types/supabase-types";
import { createClient } from "@/utils/supabase/client";
import { type SupabaseClient } from "@supabase/supabase-js";
import { type Message } from "ai";

// Types
export type DBChatMessage = Tables<"chat_messages">;

// Specific type for the 'parts' JSONB column, for strong typing in app code
export interface MessagePart {
  type: "text" | "file" | "tool-invocation" | "tool-result";
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
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}

/**
 * Delete all messages after a specific message (for retry functionality)
 * This keeps the specified message but deletes all subsequent messages
 */
export async function deleteMessagesAfter(messageId: string): Promise<number> {
  const supabase = createClient();

  // First get the message details
  const { data: message, error: fetchError } = await supabase
    .from("chat_messages")
    .select("session_id, created_at")
    .eq("id", messageId)
    .single();

  if (fetchError) {
    console.error(`Error fetching message ${messageId}:`, fetchError);
    throw new Error(`Failed to fetch message: ${fetchError.message}`);
  }

  // Delete all messages after this one (but not the message itself)
  const { error: deleteError } = await supabase
    .from("chat_messages")
    .delete()
    .eq("session_id", message.session_id)
    .gt("created_at", message.created_at);

  if (deleteError) {
    console.error(`Error deleting messages after ${messageId}:`, deleteError);
    throw new Error(`Failed to delete messages: ${deleteError.message}`);
  }

  // Return the count (we don't have it from the delete, but we can estimate)
  return 1; // At least some messages were potentially deleted
}

/**
 * Delete a message and all messages after it (for retry functionality)
 * This is specifically for retrying assistant messages where we want to delete
 * the assistant message itself AND any subsequent messages
 */
export async function deleteMessageAndAfter(messageId: string): Promise<number> {
  const supabase = createClient();

  // First get the message details
  const { data: message, error: fetchError } = await supabase
    .from("chat_messages")
    .select("session_id, created_at")
    .eq("id", messageId)
    .single();

  if (fetchError) {
    console.error(`Error fetching message ${messageId}:`, fetchError);
    throw new Error(`Failed to fetch message: ${fetchError.message}`);
  }

  // Delete the message and all messages after it
  const { error: deleteError } = await supabase
    .from("chat_messages")
    .delete()
    .eq("session_id", message.session_id)
    .gte("created_at", message.created_at);

  if (deleteError) {
    console.error(`Error deleting message and messages after ${messageId}:`, deleteError);
    throw new Error(`Failed to delete messages: ${deleteError.message}`);
  }

  // Return the count (we don't have it from the delete, but we can estimate)
  return 1; // At least the message itself was deleted
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
 * Save a user message
 */
export async function saveUserMessage(
  userMessage: Message & { dbParts: MessagePart[] },
  sessionId: string,
  userId: string
): Promise<DBChatMessage> {
  return await addMessage({
    id: userMessage.id,
    session_id: sessionId,
    user_id: userId,
    role: "user",
    parts: userMessage.dbParts,
    model_used: null,
    model_provider: null,
    model_config: null,
    metadata: {},
  });
}

/**
 * Save an assistant message
 */
export async function saveAssistantMessage(
  messageId: string,
  sessionId: string,
  userId: string,
  parts: MessagePart[],
  model: string,
  modelProvider: string,
  modelConfig: Json,
  metadata: Json = {}
): Promise<DBChatMessage> {
  return await addMessage({
    id: messageId,
    session_id: sessionId,
    user_id: userId,
    role: "assistant",
    parts,
    model_used: model,
    model_provider: modelProvider,
    model_config: modelConfig,
    metadata,
  });
}

/**
 * Save a system message
 */
export async function saveSystemMessage(
  messageId: string,
  sessionId: string,
  userId: string,
  parts: MessagePart[],
  metadata: Json = {}
): Promise<DBChatMessage> {
  return await addMessage({
    id: messageId,
    session_id: sessionId,
    user_id: userId,
    role: "system",
    parts,
    model_used: null,
    model_provider: null,
    model_config: null,
    metadata,
  });
}

/**
 * Save a tool message
 */
export async function saveToolMessage(
  messageId: string,
  sessionId: string,
  userId: string,
  parts: MessagePart[],
  metadata: Json = {}
): Promise<DBChatMessage> {
  return await addMessage({
    id: messageId,
    session_id: sessionId,
    user_id: userId,
    role: "tool",
    parts,
    model_used: null,
    model_provider: null,
    model_config: null,
    metadata,
  });
}

/**
 * Save a user message (server-side version)
 */
export async function saveUserMessageServer(
  supabase: SupabaseClient,
  userMessage: Message & { dbParts: MessagePart[] },
  sessionId: string,
  userId: string
): Promise<DBChatMessage> {
  return await addMessageServer(supabase, {
    id: userMessage.id,
    session_id: sessionId,
    user_id: userId,
    role: "user",
    parts: userMessage.dbParts,
    model_used: null,
    model_provider: null,
    model_config: null,
    metadata: {},
  });
}

/**
 * Save an assistant message (server-side version)
 */
export async function saveAssistantMessageServer(
  supabase: SupabaseClient,
  messageId: string,
  sessionId: string,
  userId: string,
  parts: MessagePart[],
  model: string,
  modelProvider: string,
  modelConfig: Json,
  metadata: Json = {}
): Promise<DBChatMessage> {
  return await addMessageServer(supabase, {
    id: messageId,
    session_id: sessionId,
    user_id: userId,
    role: "assistant",
    parts,
    model_used: model,
    model_provider: modelProvider,
    model_config: modelConfig,
    metadata,
  });
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
