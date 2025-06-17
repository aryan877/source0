"use client";

import { ArrowDownTrayIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import Image from "next/image";
import { memo, useCallback, useState } from "react";

interface SecureFileDisplayProps {
  url?: string;
  mimeType: string;
  fileName?: string;
  isImage?: boolean;
}

const SecureFileDisplay = memo(({ url, mimeType, fileName, isImage }: SecureFileDisplayProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!url || !fileName) return;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  }, [url, fileName]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // If it's an image but URL is missing or image failed to load, show image placeholder
  if (isImage && mimeType.startsWith("image/") && (!url || imageError)) {
    return (
      <div className="mb-3 max-w-sm overflow-hidden rounded-lg border border-divider bg-content1">
        <div className="flex h-32 w-full items-center justify-center bg-content2">
          <div className="flex flex-col items-center gap-2 text-default-400">
            <PhotoIcon className="h-8 w-8" />
            <span className="text-xs">Image unavailable</span>
          </div>
        </div>
        {fileName && (
          <div className="px-3 py-2">
            <span className="text-xs text-default-600">{fileName}</span>
          </div>
        )}
      </div>
    );
  }

  // Generic file unavailable state for non-images
  if (!url) {
    return (
      <div className="mb-3 rounded-lg border border-danger/30 bg-danger/5 p-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-danger/20 text-sm">
            ❌
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-danger">File unavailable</span>
            <span className="text-xs text-danger/70">Could not get file URL.</span>
          </div>
        </div>
      </div>
    );
  }

  if (isImage && mimeType.startsWith("image/")) {
    return (
      <>
        <div className="mb-3 max-w-sm overflow-hidden rounded-lg bg-default-100 dark:bg-default-50">
          <div
            className="cursor-pointer transition-all hover:opacity-80"
            onClick={() => setIsModalOpen(true)}
          >
            <Image
              src={url}
              alt={fileName || "Attached image"}
              width={300}
              height={200}
              className="h-auto w-full object-cover"
              unoptimized
              onError={handleImageError}
            />
          </div>
          {fileName && (
            <div className="px-3 py-2">
              <span className="text-xs text-default-600">{fileName}</span>
            </div>
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          size="3xl"
          placement="center"
          className="mx-4"
        >
          <ModalContent>
            <ModalHeader className="flex items-center justify-between">
              <span className="truncate">{fileName || "Image"}</span>
            </ModalHeader>
            <ModalBody className="p-0">
              <div className="flex items-center justify-center bg-black/5 dark:bg-black/20">
                <Image
                  src={url}
                  alt={fileName || "Attached image"}
                  width={800}
                  height={600}
                  className="max-h-[70vh] w-auto object-contain"
                  unoptimized
                  onError={handleImageError}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" color="default" onPress={() => setIsModalOpen(false)}>
                Close
              </Button>
              <Button
                color="primary"
                startContent={<ArrowDownTrayIcon className="h-4 w-4" />}
                onPress={handleDownload}
              >
                Download
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </>
    );
  }

  return (
    <div className="mb-3 rounded-lg bg-default-100 px-3 py-2 dark:bg-default-50">
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-content2 text-sm">
          📎
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-xs font-medium text-foreground transition-colors hover:text-primary"
          >
            {fileName || "File attachment"}
          </a>
          <span className="text-xs text-default-500">{mimeType}</span>
        </div>
        <Button
          size="sm"
          variant="flat"
          isIconOnly
          onPress={handleDownload}
          className="flex-shrink-0"
        >
          <ArrowDownTrayIcon className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
});

SecureFileDisplay.displayName = "SecureFileDisplay";

export { SecureFileDisplay };
export type { SecureFileDisplayProps };
