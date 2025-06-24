import type { SupabaseClient } from "@supabase/supabase-js";

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
