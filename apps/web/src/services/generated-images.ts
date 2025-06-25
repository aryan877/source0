import { createClient } from "@/utils/supabase/client";

export interface GeneratedImage {
  id: string;
  file_path: string;
  created_at: string;
  publicUrl: string;
  prompt: string;
}

export interface GeneratedImagesFilters {
  pageSize?: number;
}

export async function getGeneratedImages(
  filters: GeneratedImagesFilters & { cursor?: string } = {}
) {
  const supabase = createClient();
  const { pageSize = 12, cursor } = filters;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to fetch images");
  }

  let query = supabase
    .from("generated_images")
    .select("id, file_path, created_at, prompt")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(pageSize);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching generated images:", error);
    throw error;
  }

  const imagesWithUrls = (data || []).map((image) => {
    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-attachments").getPublicUrl(image.file_path);

    return {
      ...image,
      publicUrl,
    };
  });

  const nextCursor = data && data.length === pageSize ? data[data.length - 1]?.created_at : null;

  return {
    data: imagesWithUrls,
    nextCursor,
  };
}
