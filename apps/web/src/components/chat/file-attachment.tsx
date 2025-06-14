"use client";

import { type UploadResult } from "@/utils/supabase/storage";
import {
  DocumentTextIcon,
  ExclamationCircleIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { useEffect, useState } from "react";

export interface AttachedFileWithUrl {
  file: File;
  uploadResult?: UploadResult;
  uploading?: boolean;
  error?: string;
}

interface FileAttachmentProps {
  files: AttachedFileWithUrl[];
  onRemove: (index: number) => void;
}

export const FileAttachment = ({ files, onRemove }: FileAttachmentProps) => {
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    // Create a new URL for each image file.
    const newImagePreviews = files.map((attachedFile) => {
      if (attachedFile.file.type.startsWith("image/")) {
        return URL.createObjectURL(attachedFile.file);
      }
      return "";
    });
    setImagePreviews(newImagePreviews);

    return () => {
      newImagePreviews.forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [files]);

  const getFileIcon = (file: File, previewUrl: string | undefined) => {
    if (file.type.startsWith("image/") && previewUrl) {
      return (
        <div className="h-12 w-12 overflow-hidden rounded-lg">
          <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
        </div>
      );
    }
    // Fallback for non-images or if preview isn't ready
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-content2">
        {file.type.startsWith("image/") ? (
          <PhotoIcon className="h-6 w-6 text-primary" />
        ) : (
          <DocumentTextIcon className="h-6 w-6" />
        )}
      </div>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-wrap gap-3">
      {files.map((attachedFile, index) => {
        const { file, uploading, error } = attachedFile;
        const previewUrl = imagePreviews[index];

        return (
          <Card key={index} className="relative max-w-[300px] overflow-hidden">
            <CardBody className="p-4">
              <div className={`flex items-center gap-3 ${uploading ? "opacity-50" : ""}`}>
                <div className="flex-shrink-0">{getFileIcon(file, previewUrl)}</div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="max-w-[200px] truncate text-sm font-semibold">{file.name}</span>
                  <span className="text-xs text-default-500">{formatFileSize(file.size)}</span>
                </div>
                <Button
                  variant="light"
                  isIconOnly
                  color="danger"
                  size="sm"
                  onPress={() => onRemove(index)}
                  className="ml-auto"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardBody>

            {/* Spinner Overlay */}
            {uploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
                <Spinner color="primary" />
                <span className="mt-2 text-xs font-medium text-white">Uploading...</span>
              </div>
            )}

            {/* Error Overlay */}
            {error && !uploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-danger/50 backdrop-blur-sm">
                <ExclamationCircleIcon className="h-8 w-8 text-white" />
                <span className="mt-2 px-2 text-center text-xs font-medium text-white">
                  Upload Failed
                </span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
