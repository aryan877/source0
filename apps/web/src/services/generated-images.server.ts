import { type Database } from "@/types/supabase-types";
import { type SupabaseClient } from "@supabase/supabase-js";

export type GeneratedImageRecord = Database["public"]["Tables"]["generated_images"]["Insert"];

export async function saveGeneratedImage(
  supabase: SupabaseClient<Database>,
  imageRecord: Omit<GeneratedImageRecord, "id" | "created_at">
): Promise<Database["public"]["Tables"]["generated_images"]["Row"]> {
  const { data, error } = await supabase
    .from("generated_images")
    .insert(imageRecord)
    .select()
    .single();

  if (error) {
    console.error("Failed to save generated image record", {
      error: error.message,
      details: error.details,
    });
    throw new Error(`Failed to save generated image record: ${error.message}`);
  }

  return data;
}
