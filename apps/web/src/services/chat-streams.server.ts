import { redis } from "@/utils/redis";
import { createClient } from "@/utils/supabase/server";
import { generateId } from "ai";

/**
 * Append a new stream ID for a chat session
 * Stores in both Supabase (for persistence) and Redis (for resumable streams)
 */
export async function appendStreamId({
  chatId,
  streamId,
}: {
  chatId: string;
  streamId?: string;
}): Promise<string> {
  const supabase = await createClient();
  const finalStreamId = streamId || generateId();

  // Store in Supabase for persistence
  const { error } = await supabase.from("chat_stream_ids").insert({
    chat_id: chatId,
    stream_id: finalStreamId,
  });

  if (error) {
    console.error("Error appending stream ID:", error);
    throw new Error(`Failed to append stream ID: ${error.message}`);
  }

  // Store in Redis for resumable streams with TTL (streams auto-expire after 24 hours)
  try {
    if (redis) {
      await redis.setex(`chat:${chatId}:latest_stream`, 86400, finalStreamId);
      console.log("Stored stream ID in Redis:", finalStreamId, "for chat:", chatId);
    }
  } catch (redisError) {
    console.error("Redis storage failed (non-critical):", redisError);
    // Don't throw - Redis is for optimization, not critical path
  }

  console.log("Appended stream ID:", finalStreamId, "for chat:", chatId);
  return finalStreamId;
}

/**
 * Load the most recent stream ID for a chat session from Redis first, fallback to Supabase
 * This enables fast resumable stream lookups
 */
export async function loadLatestStream(chatId: string): Promise<string | null> {
  try {
    // Try Redis first for fastest lookup
    if (redis) {
      const latestStreamId = await redis.get(`chat:${chatId}:latest_stream`);

      if (latestStreamId) {
        console.log("Found latest stream in Redis:", latestStreamId);
        return latestStreamId;
      }
    }
  } catch (redisError) {
    console.error("Redis lookup failed, falling back to Supabase:", redisError);
  }

  // Fallback to Supabase
  const supabase = await createClient();
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
 * Load all stream IDs for a chat session (legacy support)
 * Only returns active (non-cancelled, non-complete) streams
 */
export async function loadStreams(chatId: string): Promise<string[]> {
  const latestActiveStream = await loadLatestActiveStream(chatId);
  return latestActiveStream ? [latestActiveStream] : [];
}

/**
 * Mark a stream as cancelled in the database
 */
export async function markStreamCancelled(streamId: string): Promise<void> {
  const supabase = await createClient();

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
 * Mark a stream as complete in the database
 */
export async function markStreamComplete(streamId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("chat_stream_ids")
    .update({ complete: true })
    .eq("stream_id", streamId);

  if (error) {
    console.error("Error marking stream as complete:", error);
    throw new Error(`Failed to mark stream as complete: ${error.message}`);
  }

  console.log("Marked stream as complete:", streamId);
}

/**
 * Check if a stream is cancelled or complete
 */
export async function getStreamStatus(
  streamId: string
): Promise<{ cancelled: boolean; complete: boolean } | null> {
  const supabase = await createClient();

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
 * Load the most recent active (non-cancelled, non-complete) stream ID for a chat session
 */
export async function loadLatestActiveStream(chatId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_stream_ids")
    .select("stream_id")
    .eq("chat_id", chatId)
    .eq("cancelled", false)
    .eq("complete", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.log("No active streams found for chat:", chatId);
    return null;
  }

  return data.stream_id;
}

/**
 * Clean up expired streams from Redis (called periodically)
 * Note: Streams auto-expire in Redis, but this provides manual cleanup
 */
export async function cleanupExpiredStreams(chatId: string): Promise<void> {
  try {
    if (redis) {
      await redis.del(`chat:${chatId}:latest_stream`);
      console.log("Cleaned up Redis streams for chat:", chatId);
    }
  } catch (error) {
    console.error("Failed to cleanup Redis streams:", error);
  }
}
