import { type Database } from "@/types/supabase-types";
import { createClient } from "@/utils/supabase/server";

export async function saveGeneratedImage(
  imageRecord: Omit<Database["public"]["Tables"]["generated_images"]["Insert"], "id" | "created_at">
) {
  const supabase = await createClient();
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
