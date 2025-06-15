"use client";

import {
  DocumentTextIcon,
  ExclamationCircleIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  type AttachedFileWithUrl,
  createImagePreview,
  formatFileSize,
  isImageFile,
  revokeImagePreview,
} from "./utils/file-utils";

interface FileAttachmentProps {
  files: AttachedFileWithUrl[];
  onRemove: (index: number) => void;
}

const FileIcon = ({ file, previewUrl }: { file: File; previewUrl?: string }) => {
  if (isImageFile(file) && previewUrl) {
    return (
      <div className="h-12 w-12 overflow-hidden rounded-lg">
        <Image src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-content2">
      {isImageFile(file) ? (
        <PhotoIcon className="h-6 w-6 text-primary" />
      ) : (
        <DocumentTextIcon className="h-6 w-6" />
      )}
    </div>
  );
};

const FileOverlay = ({ uploading, error }: { uploading?: boolean; error?: string }) => {
  if (uploading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
        <Spinner color="primary" />
        <span className="mt-2 text-xs font-medium text-white">Uploading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-danger/50 backdrop-blur-sm">
        <ExclamationCircleIcon className="h-8 w-8 text-white" />
        <span className="mt-2 px-2 text-center text-xs font-medium text-white">Upload Failed</span>
      </div>
    );
  }

  return null;
};

export const FileAttachment = ({ files, onRemove }: FileAttachmentProps) => {
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    const newImagePreviews = files.map((attachedFile) => createImagePreview(attachedFile.file));
    setImagePreviews(newImagePreviews);

    return () => {
      newImagePreviews.forEach(revokeImagePreview);
    };
  }, [files]);

  return (
    <div className="flex flex-wrap gap-3">
      {files.map((attachedFile, index) => {
        const { file, uploading, error } = attachedFile;
        const previewUrl = imagePreviews[index];

        return (
          <Card key={index} className="relative max-w-[300px] overflow-hidden">
            <CardBody className="p-4">
              <div className={`flex items-center gap-3 ${uploading ? "opacity-50" : ""}`}>
                <div className="flex-shrink-0">
                  <FileIcon file={file} previewUrl={previewUrl} />
                </div>
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
            <FileOverlay uploading={uploading} error={error} />
          </Card>
        );
      })}
    </div>
  );
};
