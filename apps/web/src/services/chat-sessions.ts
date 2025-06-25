import { type Json, type Tables } from "@/types/supabase-types";
import { createClient } from "@/utils/supabase/client";
import { v4 as uuidv4 } from "uuid";

// Types
export type ChatSession = Tables<"chat_sessions">;

export interface SessionBranch {
  branch_id: string;
  branch_title: string;
  branch_created_at: string;
  branch_point_message: Json;
  branch_point_time: string;
}

export interface SessionAncestry {
  session_id: string;
  title: string;
  level: number;
  created_at: string;
}

/**
 * Create a new chat session
 */
export async function createSession(
  userId: string,
  title: string,
  systemPrompt?: string,
  sessionId?: string
): Promise<ChatSession> {
  const supabase = createClient();
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
 * Get all chat sessions for a user
 */
export async function getUserSessions(
  userId: string,
  {
    pageSize = 30, // Increased page size for sidebar
    cursor,
    searchTerm,
  }: {
    pageSize?: number;
    cursor?: string;
    searchTerm?: string;
  } = {}
): Promise<{ data: ChatSession[]; nextCursor: string | null }> {
  const supabase = createClient();

  if (searchTerm) {
    // If there's a search term, we use the RPC function which handles its own pagination/limiting.
    // And does not support cursor-based pagination.
    const { data, error } = await supabase.rpc("search_user_sessions", {
      p_search_term: searchTerm,
    });

    if (error) {
      console.error("Error searching chat sessions:", error);
      throw error;
    }
    return { data: data || [], nextCursor: null };
  }

  // Standard paginated fetching without search
  let query = supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(pageSize);

  if (cursor) {
    query = query.lt("updated_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching chat sessions:", error);
    throw error;
  }

  const nextCursor = data && data.length === pageSize ? data[data.length - 1]?.updated_at : null;

  return { data: data || [], nextCursor };
}

/**
 * Get a specific chat session
 */
export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) {
    // PostgREST error `PGRST116` indicates that `single()` found no rows.
    // This is not a "real" error in our case; it just means the session doesn't exist.
    // We can return null and let the query succeed.
    if (error.code === "PGRST116") {
      return null;
    }
    // For all other errors, we should re-throw so React Query can handle them properly.
    console.error(`Error fetching chat session ${sessionId}:`, error);
    throw error;
  }
  return data;
}

/**
 * Update session title
 */
export async function updateTitle(sessionId: string, title: string): Promise<ChatSession> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .update({ title })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error("Error updating chat session title:", error);
    throw new Error(`Failed to update chat session title: ${error.message}`);
  }
  return data;
}

/**
 * Update system prompt
 */
export async function updateSystemPrompt(sessionId: string, systemPrompt: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("chat_sessions")
    .update({ system_prompt: systemPrompt })
    .eq("id", sessionId);

  if (error) {
    console.error("Error updating system prompt:", error);
    throw new Error(`Failed to update system prompt: ${error.message}`);
  }
}

/**
 * Delete a chat session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId);

  if (error) {
    console.error("Error deleting chat session:", error);
    throw new Error(`Failed to delete chat session: ${error.message}`);
  }
}

/**
 * Generate a unique share slug
 */
export function generateShareSlug(): string {
  return uuidv4().substring(0, 8);
}

/**
 * Make a session public and generate share slug
 */
export async function makePublic(sessionId: string): Promise<string> {
  const supabase = createClient();
  const shareSlug = generateShareSlug();

  const { error } = await supabase
    .from("chat_sessions")
    .update({
      is_public: true,
      share_slug: shareSlug,
    })
    .eq("id", sessionId);

  if (error) {
    console.error("Error making session public:", error);
    throw new Error(`Failed to make session public: ${error.message}`);
  }

  return shareSlug;
}

/**
 * Make a session private
 */
export async function makePrivate(sessionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("chat_sessions")
    .update({
      is_public: false,
      share_slug: null,
    })
    .eq("id", sessionId);

  if (error) {
    console.error("Error making session private:", error);
    throw new Error(`Failed to make session private: ${error.message}`);
  }
}

/**
 * Get public sessions
 */
export async function getPublicSessions(limit = 50): Promise<ChatSession[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching public sessions:", error);
    return [];
  }
  return data;
}

/**
 * Branch a session from a specific message
 */
export async function branchSession(
  originalSessionId: string,
  branchFromMessageId: string,
  newTitle?: string
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("branch_chat_session", {
    p_original_session_id: originalSessionId,
    p_branch_from_message_id: branchFromMessageId,
    p_new_title: newTitle || null,
  });

  if (error) {
    console.error("Error branching session:", error);
    throw new Error(`Failed to branch session: ${error.message}`);
  }

  return data;
}

/**
 * Get all branches of a session
 */
export async function getSessionBranches(sessionId: string): Promise<SessionBranch[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_session_branches", {
    p_session_id: sessionId,
  });

  if (error) {
    console.error("Error fetching session branches:", error);
    return [];
  }

  return data;
}

/**
 * Get branch ancestry (parent chain)
 */
export async function getBranchAncestry(sessionId: string): Promise<SessionAncestry[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_branch_ancestry", {
    p_session_id: sessionId,
  });

  if (error) {
    console.error("Error fetching branch ancestry:", error);
    return [];
  }

  return data;
}

/**
 * Update session metadata
 */
export async function updateSessionMetadata(sessionId: string, metadata: Json): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chat_sessions").update({ metadata }).eq("id", sessionId);

  if (error) {
    console.error("Error updating session metadata:", error);
    throw new Error(`Failed to update session metadata: ${error.message}`);
  }
}

/**
 * Pins a chat session.
 */
export async function pinSession(sessionId: string): Promise<ChatSession> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .update({ is_pinned: true })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error(`Error pinning session ${sessionId}:`, error);
    throw new Error(`Failed to pin session: ${error.message}`);
  }
  return data;
}

/**
 * Unpins a chat session.
 */
export async function unpinSession(sessionId: string): Promise<ChatSession> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .update({ is_pinned: false })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error(`Error unpinning session ${sessionId}:`, error);
    throw new Error(`Failed to unpin session: ${error.message}`);
  }
  return data;
}

/**
 * Get new or updated sessions since a specific time.
 */
export async function getNewUserSessions(userId: string, since: string): Promise<ChatSession[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", since)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching new chat sessions:", error);
    throw error;
  }

  return data || [];
}
