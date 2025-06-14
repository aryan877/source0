import { type UploadResult } from "@/utils/supabase/storage";

export interface AttachedFileWithUrl {
  file: File;
  uploadResult?: UploadResult;
  uploading?: boolean;
  error?: string;
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const createImagePreview = (file: File): string => {
  return file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
};

export const revokeImagePreview = (url: string): void => {
  if (url) URL.revokeObjectURL(url);
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith("image/");
};

export const validateFileForUpload = (
  attachedFiles: AttachedFileWithUrl[]
): {
  isValid: boolean;
  error?: string;
} => {
  const stillUploading = attachedFiles.some((file) => file.uploading);
  if (stillUploading) {
    return { isValid: false, error: "Please wait for files to finish uploading." };
  }

  const failedFiles = attachedFiles.filter((file) => file.error);
  if (failedFiles.length > 0) {
    return {
      isValid: false,
      error: "Some files failed to upload. Please remove them or try again.",
    };
  }

  return { isValid: true };
};
