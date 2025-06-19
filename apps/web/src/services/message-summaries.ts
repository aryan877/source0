import { type Tables } from "@/types/supabase-types";
import { createClient } from "@/utils/supabase/client";
import { type SupabaseClient } from "@supabase/supabase-js";

// Types
export type DBMessageSummary = Tables<"message_summaries">;

export type MessageSummary = Omit<DBMessageSummary, "created_at"> & {
  created_at: string;
};

/**
 * Get all summaries for a session
 */
export async function getSummariesForSession(sessionId: string): Promise<MessageSummary[]> {
  if (!sessionId || sessionId === "new") {
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("message_summaries")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching message summaries:", error);
    return [];
  }

  return data as MessageSummary[];
}

/**
 * Saves a message summary to the database.
 */
export async function saveMessageSummary(
  supabase: SupabaseClient,
  summary: Omit<MessageSummary, "id" | "created_at">
): Promise<DBMessageSummary> {
  const { data, error } = await supabase
    .from("message_summaries")
    .insert(summary)
    .select()
    .single();

  if (error) {
    console.error("Error saving message summary:", error);
    throw new Error(`Failed to save message summary: ${error.message}`);
  }
  return data;
}
