import { createClient } from "@/utils/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Append a stream ID to the chat_stream_ids table
 */
export async function appendStreamId(chatId: string, streamId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("chat_stream_ids")
    .insert({ chat_id: chatId, stream_id: streamId });

  if (error) {
    console.error(`Error appending stream ID: ${error.message}`);
    throw new Error(`Failed to append stream ID: ${error.message}`);
  }
}

/**
 * Load all stream IDs for a given chat
 */
export async function loadStreamIds(chatId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_stream_ids")
    .select("stream_id")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Error loading stream IDs: ${error.message}`);
    throw new Error(`Failed to load stream IDs: ${error.message}`);
  }

  return data?.map((row: { stream_id: string }) => row.stream_id) ?? [];
}

/**
 * Get the most recent stream ID for a chat
 */
export async function getLatestStreamId(chatId: string): Promise<string | null> {
  const streamIds = await loadStreamIds(chatId);
  return streamIds.length > 0 ? (streamIds[0] ?? null) : null;
}

/**
 * Delete all stream IDs for a chat
 */
export async function clearStreamIds(chatId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chat_stream_ids").delete().eq("chat_id", chatId);

  if (error) {
    console.error(`Error clearing stream IDs: ${error.message}`);
    throw new Error(`Failed to clear stream IDs: ${error.message}`);
  }
}

/**
 * Delete a specific stream ID
 */
export async function deleteStreamId(streamId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chat_stream_ids").delete().eq("stream_id", streamId);

  if (error) {
    console.error(`Error deleting stream ID: ${error.message}`);
    throw new Error(`Failed to delete stream ID: ${error.message}`);
  }
}

/**
 * Get all stream IDs with their metadata
 */
export async function getStreamDetails(chatId: string): Promise<
  Array<{
    id: string;
    stream_id: string;
    created_at: string;
  }>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_stream_ids")
    .select("id, stream_id, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Error loading stream details: ${error.message}`);
    throw new Error(`Failed to load stream details: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Cleanup old stream IDs (keep only the latest N)
 */
export async function cleanupOldStreams(chatId: string, keepCount = 5): Promise<number> {
  const streams = await getStreamDetails(chatId);

  if (streams.length <= keepCount) {
    return 0;
  }

  const streamsToDelete = streams.slice(keepCount);
  const supabase = createClient();

  const { error } = await supabase
    .from("chat_stream_ids")
    .delete()
    .in(
      "id",
      streamsToDelete.map((s) => s.id)
    );

  if (error) {
    console.error(`Error cleaning up old streams: ${error.message}`);
    throw new Error(`Failed to cleanup old streams: ${error.message}`);
  }

  return streamsToDelete.length;
}

// Server-side utilities (for API routes)
/**
 * Append a stream ID using server-side client
 */
export async function serverAppendStreamId(
  supabase: SupabaseClient,
  chatId: string,
  streamId: string
): Promise<void> {
  const { error } = await supabase
    .from("chat_stream_ids")
    .insert({ chat_id: chatId, stream_id: streamId });

  if (error) {
    console.error(`Error appending stream ID: ${error.message}`);
    throw new Error(`Failed to append stream ID: ${error.message}`);
  }
}

/**
 * Load all stream IDs using server-side client
 */
export async function serverLoadStreamIds(
  supabase: SupabaseClient,
  chatId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("chat_stream_ids")
    .select("stream_id")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Error loading stream IDs: ${error.message}`);
    throw new Error(`Failed to load stream IDs: ${error.message}`);
  }

  return data?.map((row: { stream_id: string }) => row.stream_id) ?? [];
}
