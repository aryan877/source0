import { createClient } from "./client";

const supabase = createClient();
const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
}

export interface UploadError {
  file: File;
  error: string;
  details?: string;
}

// Type for file info returned by Supabase storage
export interface FileInfo {
  id: string;
  name: string;
  bucket_id: string;
  owner: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: Record<string, unknown>;
}

const ALLOWED_TYPES = [
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/webm",
  // Documents
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/pdf",
  "application/json",
  "application/xml",
  // Office Documents
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File size must be less than 50MB" };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "File type not supported",
    };
  }

  return { valid: true };
};

const generateFilePath = (userId: string, file: File, folder: string = "uploads"): string => {
  const timestamp = Date.now();
  const fileExtension = file.name.split(".").pop();
  const fileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
  return `${folder}/${userId}/${fileName}`;
};

/**
 * Upload a file to Supabase storage
 */
export async function uploadFile(
  file: File,
  folder: string = "uploads"
): Promise<UploadResult | Omit<UploadError, "file">> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "User must be authenticated to upload files" };
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      return { error: validation.error! };
    }

    const filePath = generateFilePath(user.id, file, folder);

    const { data, error } = await supabase.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("Upload error:", error);
      return { error: "Failed to upload file", details: error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .getPublicUrl(data.path);

    return {
      url: publicUrlData.publicUrl,
      path: data.path,
      name: file.name,
      size: file.size,
      contentType: file.type,
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      error: "Upload failed",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Upload multiple files to Supabase storage with progress tracking
 */
export async function uploadFiles(
  files: File[],
  folder: string = "uploads",
  onProgress?: (progress: number) => void
): Promise<{ successful: UploadResult[]; failed: UploadError[] }> {
  const successful: UploadResult[] = [];
  const failed: UploadError[] = [];

  // Upload files sequentially to provide accurate progress
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;

    // Update progress before starting each upload
    const progressPercent = Math.round((i / files.length) * 100);
    onProgress?.(progressPercent);

    try {
      const result = await uploadFile(file, folder);

      if ("url" in result) {
        successful.push(result);
      } else {
        failed.push({ file, ...result });
      }
    } catch (error) {
      failed.push({
        file,
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Set progress to 100% when complete
  onProgress?.(100);

  return { successful, failed };
}

/**
 * Delete a file from Supabase storage
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(CHAT_ATTACHMENTS_BUCKET).remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Delete error:", error);
    return false;
  }
}

/**
 * Get file info from Supabase storage
 */
export async function getFileInfo(filePath: string): Promise<FileInfo | null> {
  try {
    const { data, error } = await supabase.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .list(filePath.split("/").slice(0, -1).join("/"), {
        search: filePath.split("/").pop(),
      });

    if (error) {
      console.error("Get file info error:", error);
      return null;
    }

    return (data?.[0] as FileInfo) || null;
  } catch (error) {
    console.error("Get file info error:", error);
    return null;
  }
}

/**
 * Create a signed URL for secure file access
 */
export async function createSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Create signed URL error:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Create signed URL error:", error);
    return null;
  }
}

/**
 * Check if storage bucket exists.
 * The bucket is created via migrations (see supabase/migrations).
 */
export async function checkStorageBucket(): Promise<boolean> {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error("Could not list storage buckets:", listError);
      return false;
    }

    const bucketExists = buckets.some((bucket) => bucket.name === CHAT_ATTACHMENTS_BUCKET);
    if (!bucketExists) {
      console.warn(`
        ⚠️ Storage bucket "${CHAT_ATTACHMENTS_BUCKET}" not found.
        Please ensure your Supabase migrations have been run.
        You can run them with the Supabase CLI: \`supabase db reset\` (for local dev) or apply migrations in your Supabase dashboard.
      `);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking storage bucket:", error);
    return false;
  }
}
