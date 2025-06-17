import { type Tables } from "@/types/supabase-types";
import { createClient } from "@/utils/supabase/server";

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
