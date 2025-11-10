import { type Database } from "@/types/supabase-types";
import { createClient } from "@/utils/supabase/server";

export async function saveModelUsageLog(
  usageLog: Omit<Database["public"]["Tables"]["model_usage_logs"]["Insert"], "id" | "created_at">
) {
  const supabase = await createClient();
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
