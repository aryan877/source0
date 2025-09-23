import { createClient } from "@/utils/supabase/client";

/**
 * Client-side stream operations
 */

/**
 * Mark a stream as cancelled (client-side)
 */
export async function markStreamCancelled(streamId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("chat_stream_ids")
    .update({ cancelled: true })
    .eq("stream_id", streamId);

  if (error) {
    console.error("Error marking stream as cancelled:", error);
    throw new Error(`Failed to mark stream as cancelled: ${error.message}`);
  }

  console.log("Marked stream as cancelled:", streamId);
}

/**
 * Get stream status (client-side)
 */
export async function getStreamStatus(
  streamId: string
): Promise<{ cancelled: boolean; complete: boolean } | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("chat_stream_ids")
    .select("cancelled, complete")
    .eq("stream_id", streamId)
    .single();

  if (error || !data) {
    console.log("Stream not found or error:", streamId, error);
    return null;
  }

  return data;
}

/**
 * Get the latest stream ID for a chat (client-side)
 */
export async function getLatestStreamId(chatId: string): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("chat_stream_ids")
    .select("stream_id")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.log("No streams found for chat:", chatId);
    return null;
  }

  return data.stream_id;
}

/**
 * Check if a chat has any active (non-cancelled, non-complete) streams
 */
export async function hasActiveStream(chatId: string): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("chat_stream_ids")
    .select("stream_id")
    .eq("chat_id", chatId)
    .eq("cancelled", false)
    .eq("complete", false)
    .limit(1);

  if (error) {
    console.error("Error checking for active streams:", error);
    return false;
  }

  return data && data.length > 0;
}
