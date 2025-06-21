import { ALL_SUPPORTED_MIME_TYPES } from "@/config/supported-files";
import { createClient } from "../utils/supabase/client";

const supabase = createClient();
const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
  width?: number;
  height?: number;
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

const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File size must be less than 50MB" };
  }

  if (!ALL_SUPPORTED_MIME_TYPES.includes(file.type)) {
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
 * Get image dimensions from a file
 */
const getImageDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(null);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
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

    // Get image dimensions if it's an image file
    const dimensions = await getImageDimensions(file);

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
      ...(dimensions && { width: dimensions.width, height: dimensions.height }),
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
 * List all files for the current user by scanning through chat folders.
 */
export async function listUserFiles(): Promise<{
  files: Array<{
    id: string;
    name: string;
    size: number;
    contentType: string;
    url: string;
    path: string;
    uploadDate: string;
    chatFolder: string;
  }>;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { files: [], error: "User must be authenticated to list files" };
    }

    // First, get all top-level folders (e.g., "chat-uuid", "chat-temp-timestamp")
    const { data: topLevelFolders, error: foldersError } = await supabase.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .list("", { limit: 1000 });

    if (foldersError) {
      console.error("Error listing top-level storage folders:", foldersError);
      return { files: [], error: "Failed to list storage folders." };
    }

    const allFilesPromises = topLevelFolders.map(async (folder) => {
      if (!folder.name) return [];

      const userFolderPath = `${folder.name}/${user.id}`;

      // For each top-level folder, check for files in the user's specific subfolder
      const { data: filesInFolder, error: filesError } = await supabase.storage
        .from(CHAT_ATTACHMENTS_BUCKET)
        .list(userFolderPath, { limit: 1000 });

      // It's expected that this might fail if the folder doesn't belong to the user.
      // We can safely ignore "Not Found" errors and continue.
      if (filesError) {
        if (!filesError.message.includes("The resource was not found")) {
          console.warn(`Could not list files in ${userFolderPath}:`, filesError.message);
        }
        return [];
      }

      // If we found files, process them
      return filesInFolder
        .filter((file) => file.name && file.name !== ".emptyFolderPlaceholder")
        .map((file) => {
          const filePath = `${userFolderPath}/${file.name}`;
          const { data: publicUrlData } = supabase.storage
            .from(CHAT_ATTACHMENTS_BUCKET)
            .getPublicUrl(filePath);

          // Create a user-friendly identifier for the chat folder
          let chatIdentifier = "Unknown Chat";
          if (folder.name.startsWith("chat-temp-")) {
            chatIdentifier = "Temporary Upload";
          } else if (folder.name.startsWith("chat-")) {
            const chatId = folder.name.substring(5); // "chat-".length
            chatIdentifier = `Chat (${chatId.substring(0, 4)}...)`;
          }

          return {
            id: file.id || filePath,
            name: file.name,
            size: file.metadata?.size || 0,
            contentType: file.metadata?.mimetype || "application/octet-stream",
            url: publicUrlData.publicUrl,
            path: filePath,
            uploadDate: file.created_at || new Date().toISOString(),
            chatFolder: chatIdentifier,
          };
        });
    });

    const nestedFiles = await Promise.all(allFilesPromises);
    const allUserFiles = nestedFiles.flat();

    // Sort all files by date before returning
    allUserFiles.sort(
      (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );

    return { files: allUserFiles };
  } catch (error) {
    console.error("Critical error in listUserFiles:", error);
    return {
      files: [],
      error: error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}

/**
 * Delete multiple files from storage
 */
export async function deleteFiles(filePaths: string[]): Promise<{
  success: boolean;
  deletedCount: number;
  errors: string[];
}> {
  try {
    const { error } = await supabase.storage.from(CHAT_ATTACHMENTS_BUCKET).remove(filePaths);

    if (error) {
      console.error("Delete files error:", error);
      return {
        success: false,
        deletedCount: 0,
        errors: [error.message],
      };
    }

    return {
      success: true,
      deletedCount: filePaths.length,
      errors: [],
    };
  } catch (error) {
    console.error("Delete files error:", error);
    return {
      success: false,
      deletedCount: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
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
