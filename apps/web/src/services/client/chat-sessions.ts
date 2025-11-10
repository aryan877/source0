import { createClient } from "@/utils/supabase/client";
import { v4 as uuidv4 } from "uuid";

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
) {
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

  const nextCursor = data && data.length === pageSize ? data[data.length - 1]?.updated_at ?? null : null;

  return { data: data || [], nextCursor };
}

/**
 * Get a specific chat session
 */
export async function getSession(sessionId: string) {
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
export async function updateTitle(sessionId: string, title: string) {
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
 * Delete a chat session
 */
export async function deleteSession(sessionId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId);

  if (error) {
    console.error("Error deleting chat session:", error);
    throw new Error(`Failed to delete chat session: ${error.message}`);
  }
}

/**
 * Make a session public and generate share slug
 */
export async function makePublic(sessionId: string) {
  const supabase = createClient();
  const shareSlug = uuidv4().substring(0, 8);

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
export async function makePrivate(sessionId: string) {
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
 * Branch a session from a specific message
 */
export async function branchSession(
  originalSessionId: string,
  branchFromMessageId: string,
  newTitle?: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("branch_chat_session", {
    p_original_session_id: originalSessionId,
    p_branch_from_message_id: branchFromMessageId,
    p_new_title: newTitle || undefined,
  });

  if (error) {
    console.error("Error branching session:", error);
    throw new Error(`Failed to branch session: ${error.message}`);
  }

  return data;
}

/**
 * Pins a chat session.
 */
export async function pinSession(sessionId: string) {
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
export async function unpinSession(sessionId: string) {
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
export async function getNewUserSessions(userId: string, since: string) {
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
