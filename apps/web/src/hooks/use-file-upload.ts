import { uploadFiles } from "@/utils/supabase/storage";
import { useCallback } from "react";

const logError = (error: Error, context: string, data: Record<string, unknown> = {}) => {
  const isDevelopment = process.env.NODE_ENV === "development";
  console.error(`🚨 [Chat Error - ${context}]`, {
    error: {
      message: error.message,
      name: error.name,
      stack: isDevelopment ? error.stack : undefined,
    },
    ...data,
  });
};

export const useFileUpload = (chatId: string, updateUiError: (error: string | null) => void) => {
  const uploadFilesToStorage = useCallback(
    async (files: File[]) => {
      updateUiError(null);

      try {
        const uploadPath = chatId === "new" ? `chat-temp-${Date.now()}` : `chat-${chatId}`;
        const { successful, failed } = await uploadFiles(files, uploadPath);

        if (failed.length > 0) {
          const failedFileNames = failed.map((f) => f.file.name).join(", ");
          const errorMessage = `Failed to upload: ${failedFileNames}. ${failed[0]?.error ?? ""}`;
          updateUiError(errorMessage);

          failed.forEach((failure) => {
            logError(new Error(`File upload failed: ${failure.error}`), "File Upload Error", {
              chatId,
              fileName: failure.file.name,
              uploadError: failure.error,
            });
          });
        }

        return { successful, failed };
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown upload error");
        logError(err, "File Upload System Error", {
          chatId,
          fileCount: files.length,
          fileNames: files.map((f) => f.name),
        });
        updateUiError(`An unexpected error occurred during upload: ${err.message}`);
        return { successful: [], failed: files.map((file) => ({ file, error: "Upload failed" })) };
      }
    },
    [chatId, updateUiError]
  );

  return { uploadFilesToStorage };
};
