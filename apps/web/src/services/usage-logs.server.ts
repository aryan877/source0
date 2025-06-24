import { type Database } from "@/types/supabase-types";
import { type SupabaseClient } from "@supabase/supabase-js";

export type ModelUsageLog = Database["public"]["Tables"]["model_usage_logs"]["Insert"];

export async function saveModelUsageLog(
  supabase: SupabaseClient<Database>,
  usageLog: Omit<ModelUsageLog, "id" | "created_at">
): Promise<Database["public"]["Tables"]["model_usage_logs"]["Row"]> {
  const { data, error } = await supabase
    .from("model_usage_logs")
    .insert(usageLog)
    .select()
    .single();

  if (error) {
    console.error("Failed to save model usage log", {
      error: error.message,
      details: error.details,
    });
    throw new Error(`Failed to save model usage log: ${error.message}`);
  }

  return data;
}
