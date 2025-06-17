import { deleteFiles, listUserFiles } from "@/utils/supabase/storage";
import { useCallback, useEffect, useState } from "react";

interface UserFile {
  id: string;
  name: string;
  size: number;
  contentType: string;
  url: string;
  path: string;
  uploadDate: string;
  chatFolder: string;
}

export const useUserFiles = () => {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listUserFiles();

      if (result.error) {
        setError(result.error);
      } else {
        setFiles(result.files);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFile = useCallback(async (fileId: string, filePath: string) => {
    setDeleting((prev) => new Set(prev).add(fileId));

    try {
      const result = await deleteFiles([filePath]);

      if (result.success) {
        setFiles((prev) => prev.filter((file) => file.id !== fileId));
      } else {
        throw new Error(result.errors[0] || "Failed to delete file");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
      throw err; // Re-throw so the component can handle it
    } finally {
      setDeleting((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  }, []);

  const deleteMultipleFiles = useCallback(async (fileIds: string[], filePaths: string[]) => {
    // Mark all files as deleting
    setDeleting((prev) => {
      const newSet = new Set(prev);
      fileIds.forEach((id) => newSet.add(id));
      return newSet;
    });

    try {
      const result = await deleteFiles(filePaths);

      if (result.success) {
        setFiles((prev) => prev.filter((file) => !fileIds.includes(file.id)));
      } else {
        throw new Error(result.errors[0] || "Failed to delete files");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete files");
      throw err;
    } finally {
      // Remove all from deleting state
      setDeleting((prev) => {
        const newSet = new Set(prev);
        fileIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshFiles = useCallback(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return {
    files,
    loading,
    error,
    deleting,
    deleteFile,
    deleteMultipleFiles,
    clearError,
    refreshFiles,
  };
};
