import { type Tables } from "@/types/supabase-types";
import { createClient } from "@/utils/supabase/server";

export type MessageSummary = Omit<Tables<"message_summaries">, "created_at"> & {
  created_at: string;
};

export async function saveMessageSummary(
  summary: Omit<MessageSummary, "id" | "created_at">
) {
  const supabase = await createClient();
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
