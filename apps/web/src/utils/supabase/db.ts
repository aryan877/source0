import { type SupabaseClient } from "@supabase/supabase-js";
import { type Message } from "ai";
import { type Tables } from "../../types/supabase-types";

// Base types from auto-generated Supabase types
type DBChatMessage = Tables<"chat_messages">;
export type ChatSession = Tables<"chat_sessions">;

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
 * Adds a new message to the database, including any file attachments.
 */
export async function addMessage(
  supabase: SupabaseClient,
  message: Omit<ChatMessage, "id" | "created_at">
) {
  const { data, error } = await supabase.from("chat_messages").insert(message).select().single();

  if (error) {
    console.error("Error inserting message:", error);
    throw new Error("Failed to save message to database.");
  }

  return data;
}

/**
 * Creates a new chat session for a user.
 */
export async function createChatSession(
  supabase: SupabaseClient,
  userId: string,
  title: string
): Promise<ChatSession> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId, title })
    .select()
    .single();

  if (error) {
    console.error("Error creating chat session:", error);
    throw new Error("Failed to create chat session.");
  }
  return data;
}

/**
 * Retrieves all messages for a given chat session ID.
 */
export async function getMessages(
  supabase: SupabaseClient,
  sessionId: string
): Promise<ChatMessage[]> {
  if (!sessionId || sessionId === "new") {
    return [];
  }

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
 * Retrieves a single chat session by its ID.
 */
export async function getChatSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<ChatSession | null> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) {
    console.error(`Error fetching chat session ${sessionId}:`, error);
    return null;
  }

  return data;
}

/**
 * Retrieves all chat sessions for a given user, ordered by last updated.
 */
export async function getChatSessions(
  supabase: SupabaseClient,
  userId: string
): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching chat sessions:", error);
    return [];
  }

  return data;
}

/**
 * Updates a chat session's title.
 */
export async function updateChatSessionTitle(
  supabase: SupabaseClient,
  sessionId: string,
  title: string
): Promise<void> {
  const { error } = await supabase.from("chat_sessions").update({ title }).eq("id", sessionId);

  if (error) {
    console.error("Error updating chat session title:", error);
    throw new Error("Failed to update chat session title.");
  }
}

/**
 * Converts database chat messages to AI SDK `Message` objects for the UI.
 * It creates a simple string representation for the `content` field and
 * attaches the full, structured `parts` data to `experimental_attachments`
 * for the UI to use for rich rendering.
 */
export function convertToAiMessages(dbMessages: ChatMessage[]): Message[] {
  return dbMessages.map((msg) => {
    // Reconstruct the parts array for the AI SDK Message object.
    const parts = msg.parts
      .map((part) => {
        if (part.type === "text") {
          return { type: "text", text: part.text ?? "" };
        }
        if (part.type === "file" && part.file) {
          const file = part.file;
          // This structure matches what `message-bubble.tsx` expects for a file part.
          return {
            type: "file",
            url: file.url,
            mimeType: file.mimeType,
            filename: file.name,
            path: file.path,
          };
        }
        return null;
      })
      .filter(Boolean);

    // Find the text content for the top-level `content` property.
    // The SDK uses this for display fallbacks and for models that only accept text.
    const textContent = msg.parts.find((part) => part.type === "text")?.text?.trim() ?? "";

    // If there's no text but there are files, provide a placeholder.
    const content = textContent || (parts.some((p) => p?.type === "file") ? "[Attachment]" : "");

    return {
      id: msg.id,
      role: msg.role as Message["role"],
      content,
      parts: parts as Message["parts"], // Pass the fully constructed parts array.
      createdAt: new Date(msg.created_at),
      annotations: [
        {
          type: "model_metadata",
          data: {
            modelUsed: msg.model_used,
            modelProvider: msg.model_provider,
          },
        },
      ],
    };
  });
}
