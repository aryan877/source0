import type { SupabaseClient } from "@supabase/supabase-js";

export async function serverAppendStreamId(
  supabase: SupabaseClient,
  sessionId: string,
  streamId: string
): Promise<void> {
  const { error } = await supabase.from("chat_stream_ids").insert([
    {
      session_id: sessionId,
      stream_id: streamId,
    },
  ]);

  if (error) {
    console.error("Error appending stream ID:", error);
    throw error;
  }
}

export async function serverGetLatestStreamIdWithStatus(
  supabase: SupabaseClient,
  sessionId: string
): Promise<{
  streamId: string;
  cancelled: boolean;
  complete: boolean;
} | null> {
  const { data, error } = await supabase
    .from("chat_stream_ids")
    .select("stream_id, cancelled, complete")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows found, which is not an error in this case
      return null;
    }
    console.error("Error getting latest stream ID:", error);
    throw error;
  }

  return data
    ? {
        streamId: data.stream_id,
        cancelled: data.cancelled ?? false,
        complete: data.complete ?? false,
      }
    : null;
}

export async function serverMarkStreamAsComplete(
  supabase: SupabaseClient,
  streamId: string
): Promise<void> {
  const { error } = await supabase
    .from("chat_stream_ids")
    .update({ complete: true })
    .eq("stream_id", streamId);

  if (error) {
    console.error("Error marking stream as complete:", error);
    throw error;
  }
}

export async function serverMarkStreamAsCancelled(
  supabase: SupabaseClient,
  streamId: string
): Promise<void> {
  const { error } = await supabase
    .from("chat_stream_ids")
    .update({ cancelled: true })
    .eq("stream_id", streamId);

  if (error) {
    console.error("Error marking stream as cancelled (server-side):", error);
    throw error;
  }
}
