import { type Tables } from "@/types/supabase-types";
import { createClient } from "@/utils/supabase/server";
import { v4 as uuidv4 } from "uuid";

// Types
export type ChatSession = Tables<"chat_sessions">;

/**
 * Get session by share slug (server-side version)
 */
export async function getSessionByShareSlug(shareSlug: string): Promise<ChatSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("share_slug", shareSlug)
    .eq("is_public", true)
    .single();

  if (error) {
    console.error(`Error fetching session by share slug ${shareSlug}:`, error);
    return null;
  }
  return data;
}

/**
 * Create a new chat session (server-side)
 */
export async function createSession(
  userId: string,
  title: string,
  systemPrompt?: string,
  sessionId?: string
): Promise<ChatSession> {
  const supabase = await createClient();
  const newSessionId = sessionId || uuidv4();

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      id: newSessionId,
      user_id: userId,
      title,
      system_prompt: systemPrompt || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating chat session:", error);
    throw new Error(`Failed to create chat session: ${error.message}`);
  }
  return data;
}

/**
 * Create or get session ID (server-side)
 */
export async function createOrGetSession(
  userId: string,
  sessionId?: string
): Promise<{ sessionId: string; isNewSession: boolean }> {
  if (!sessionId || sessionId === "new") {
    // Note: This createSession is now the server-side one in this file.
    const newSession = await createSession(userId, "New Chat");
    return { sessionId: newSession.id, isNewSession: true };
  }
  return { sessionId, isNewSession: false };
}
