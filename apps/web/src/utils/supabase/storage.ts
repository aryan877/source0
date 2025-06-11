import { createClient } from "./client";

const supabase = createClient();

// Storage bucket name for chat attachments
const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";

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

/**
 * Upload a file to Supabase storage
 */
export async function uploadFile(
  file: File,
  folder: string = "uploads"
): Promise<UploadResult | Omit<UploadError, "file">> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `${folder}/${fileName}`;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { error: "File size must be less than 10MB" };
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "text/plain",
      "text/markdown",
      "application/pdf",
      "application/json",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        error: "File type not supported",
        details: "Supported types: images, text files, PDF, JSON, CSV",
      };
    }

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return { error: "Failed to upload file", details: error.message };
    }

    // Get public URL
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
 * Upload multiple files to Supabase storage
 */
export async function uploadFiles(
  files: File[],
  folder: string = "uploads"
): Promise<{ successful: UploadResult[]; failed: UploadError[] }> {
  const results = await Promise.allSettled(files.map((file) => uploadFile(file, folder)));

  const successful: UploadResult[] = [];
  const failed: UploadError[] = [];

  results.forEach((result, index) => {
    const file = files[index]!;
    if (result.status === "fulfilled") {
      if ("url" in result.value) {
        successful.push(result.value);
      } else {
        failed.push({ file, ...result.value });
      }
    } else {
      failed.push({
        file,
        error: "Upload failed",
        details: result.reason?.message || "Unknown error",
      });
    }
  });

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
export async function getFileInfo(filePath: string): Promise<any | null> {
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

    return data?.[0] || null;
  } catch (error) {
    console.error("Get file info error:", error);
    return null;
  }
}

/**
 * Check if storage bucket exists and create if needed
 */
export async function initializeStorage(): Promise<boolean> {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error("Error listing buckets:", listError);
      return false;
    }

    const bucketExists = buckets.some((bucket) => bucket.name === CHAT_ATTACHMENTS_BUCKET);

    if (!bucketExists) {
      // Create bucket
      const { data, error: createError } = await supabase.storage.createBucket(
        CHAT_ATTACHMENTS_BUCKET,
        {
          public: true,
          allowedMimeTypes: [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif",
            "text/plain",
            "text/markdown",
            "application/pdf",
            "application/json",
            "text/csv",
          ],
          fileSizeLimit: 10 * 1024 * 1024, // 10MB
        }
      );

      if (createError) {
        console.error("Error creating bucket:", createError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Storage initialization error:", error);
    return false;
  }
}
