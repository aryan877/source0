"use client";

import {
  deleteFiles,
  listUserFiles,
  UploadError,
  uploadFiles as uploadFilesToSupabase,
  UploadResult,
} from "@/services/storage";
import { userFilesKeys } from "@/utils/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAuth } from "./useAuth";

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

interface UseStorageProps {
  chatId?: string;
  onUploadError?: (error: string | null) => void;
}

export const useStorage = ({ chatId, onUploadError }: UseStorageProps = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // From useUserFiles
  const {
    data: files,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: user ? userFilesKeys.byUser(user.id) : [],
    queryFn: async () => {
      const { files, error } = await listUserFiles();
      if (error) {
        throw new Error(error);
      }
      return files;
    },
    enabled: !!user,
  });

  const deleteMultipleFilesMutation = useMutation({
    mutationFn: (paths: string[]) => deleteFiles(paths),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: user ? userFilesKeys.byUser(user.id) : [] });
      } else {
        console.error("Failed to delete some files:", result.errors);
        // still invalidate to show which files failed to delete
        queryClient.invalidateQueries({ queryKey: user ? userFilesKeys.byUser(user.id) : [] });
      }
    },
  });

  const refreshFiles = useCallback(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: userFilesKeys.byUser(user.id) });
    }
  }, [queryClient, user?.id]);

  // From useFileUpload
  const uploadFiles = useCallback(
    async (
      filesToUpload: File[]
    ): Promise<{ successful: UploadResult[]; failed: UploadError[] }> => {
      onUploadError?.(null);

      try {
        const uploadPath =
          chatId === "new" ? `chat-temp-${Date.now()}` : chatId ? `chat-${chatId}` : "uploads";
        const { successful, failed } = await uploadFilesToSupabase(filesToUpload, uploadPath);

        if (failed.length > 0) {
          const failedFileNames = failed.map((f) => f.file.name).join(", ");
          const errorMessage = `Failed to upload: ${failedFileNames}. ${failed[0]?.error ?? ""}`;
          onUploadError?.(errorMessage);

          failed.forEach((failure) => {
            logError(new Error(`File upload failed: ${failure.error}`), "File Upload Error", {
              chatId,
              fileName: failure.file.name,
              uploadError: failure.error,
            });
          });
        }

        if (successful.length > 0) {
          refreshFiles();
        }

        return { successful, failed };
      } catch (uploadError) {
        const err = uploadError instanceof Error ? uploadError : new Error("Unknown upload error");
        logError(err, "File Upload System Error", {
          chatId,
          fileCount: filesToUpload.length,
          fileNames: filesToUpload.map((f) => f.name),
        });
        onUploadError?.(`An unexpected error occurred during upload: ${err.message}`);
        return {
          successful: [],
          failed: filesToUpload.map((file) => ({ file, error: "Upload failed" })),
        };
      }
    },
    [chatId, onUploadError, refreshFiles]
  );

  return {
    files: files ?? [],
    loading,
    error: error?.message || null,
    deleteMultipleFiles: deleteMultipleFilesMutation.mutateAsync,
    isDeleting: deleteMultipleFilesMutation.isPending,
    refreshFiles,
    uploadFiles,
  };
};
