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

/**
 * Upload a file to Supabase storage
 */
export async function uploadFile(
  file: File,
  folder: string = "uploads"
): Promise<UploadResult | Omit<UploadError, "file">> {
  try {
    // Get current user for folder organization
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User must be authenticated to upload files" };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

    // Organize files by user ID for security: folder/userId/filename
    const filePath = `${folder}/${user.id}/${fileName}`;

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

    // For private buckets, we need to create signed URLs for access
    const signedUrl = await createSignedUrl(data.path, 3600); // 1 hour expiry

    if (!signedUrl) {
      console.warn("Failed to create signed URL, falling back to public URL");
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
    }

    return {
      url: signedUrl,
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
      // Create bucket as private for security
      const { error: createError } = await supabase.storage.createBucket(CHAT_ATTACHMENTS_BUCKET, {
        public: false, // Changed to private for better security
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
      });

      if (createError) {
        console.error("Error creating bucket:", createError);
        return false;
      }

      console.log(`✅ Created storage bucket: ${CHAT_ATTACHMENTS_BUCKET}`);
    }

    return true;
  } catch (error) {
    console.error("Storage initialization error:", error);
    return false;
  }
}

/**
 * Setup RLS policies for the storage bucket
 * This should be run once during setup or migration
 */
export async function setupStoragePolicies(): Promise<boolean> {
  try {
    // Note: These policies need to be created via SQL in your Supabase dashboard
    // or through a migration. This function serves as documentation.

    console.log(`
📋 Required RLS Policies for ${CHAT_ATTACHMENTS_BUCKET} bucket:

1. Allow authenticated users to upload files:
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = '${CHAT_ATTACHMENTS_BUCKET}');

2. Allow users to view their own files:
CREATE POLICY "Allow users to view own files" ON storage.objects
FOR SELECT TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);

3. Allow users to delete their own files:
CREATE POLICY "Allow users to delete own files" ON storage.objects
FOR DELETE TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);

4. Allow users to update their own files:
CREATE POLICY "Allow users to update own files" ON storage.objects
FOR UPDATE TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);

Please run these SQL commands in your Supabase SQL editor or create a migration.
    `);

    return true;
  } catch (error) {
    console.error("Setup storage policies error:", error);
    return false;
  }
}
