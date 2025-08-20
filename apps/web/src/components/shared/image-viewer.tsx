"use client";

import { ArrowDownTrayIcon, EyeIcon } from "@heroicons/react/24/outline";
import {
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tooltip,
} from "@heroui/react";
import { format, formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { memo, useCallback, useState } from "react";

export interface ImageViewerProps {
  src: string;
  alt?: string;
  filename?: string;
  prompt?: string;
  createdAt?: string;
  type: "uploaded" | "generated";
  size?: "small" | "medium" | "large";
  showActions?: boolean;
  className?: string;
  onDownload?: (url: string, filename: string) => void;
}

interface ModalData {
  src: string;
  alt: string;
  filename?: string;
  prompt?: string;
  createdAt?: string;
  type: "uploaded" | "generated";
}

const ImageViewer = memo(({
  src,
  alt = "Image",
  filename,
  prompt,
  createdAt,
  type,
  size = "small",
  showActions = true,
  className = "",
  onDownload,
}: ImageViewerProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeConfig = {
    small: { width: 250, height: 200, maxWidth: "max-w-xs" },
    medium: { width: 350, height: 280, maxWidth: "max-w-sm" },
    large: { width: 450, height: 360, maxWidth: "max-w-md" },
  };

  const config = sizeConfig[size];

  const formatImageDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    if (date.getFullYear() === now.getFullYear()) {
      return format(date, "MMM d");
    }

    return format(date, "MMM d, yyyy");
  }, []);

  const handleImageClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!onDownload) {
      // Default download logic
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);

        let downloadFilename = "image.png";
        
        if (filename) {
          downloadFilename = filename;
        } else if (prompt && type === "generated") {
          const sanitizedPrompt = prompt
            .substring(0, 50)
            .trim()
            .replace(/[^a-z0-9 -]/gi, "")
            .replace(/\s+/g, "_")
            .toLowerCase();
          downloadFilename = `${sanitizedPrompt || "generated-image"}.png`;
        }

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = downloadFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        console.error("Download failed:", error);
      }
    } else {
      onDownload(src, filename || alt);
    }
  }, [src, filename, prompt, type, alt, onDownload]);

  const modalData: ModalData = {
    src,
    alt,
    filename,
    prompt,
    createdAt,
    type,
  };

  return (
    <>
      {/* Main Image Display */}
      <div className={`group relative ${className}`}>
        <div className="relative">
          {imageError ? (
            <div className={`flex items-center justify-center bg-content2 rounded-lg ${config.maxWidth}`} style={{ width: config.width, height: config.height }}>
              <div className="flex flex-col items-center gap-2 text-default-400">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs">Image unavailable</span>
              </div>
            </div>
          ) : (
            <div className="relative inline-block">
              <Image
                src={src}
                alt={alt}
                width={config.width}
                height={config.height}
                className={`${config.maxWidth} h-auto rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]`}
                unoptimized
                onError={() => setImageError(true)}
                onClick={handleImageClick}
              />
              
              {/* Action buttons overlay directly on the image */}
              {showActions && (
            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <Tooltip content="View full size" delay={300}>
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  className="h-7 w-7 bg-black/50 text-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-black/60"
                  onPress={handleImageClick}
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
              <Tooltip content="Download image" delay={300}>
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  className="h-7 w-7 bg-black/50 text-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-black/60"
                  onPress={handleDownload}
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image info */}
        {(filename || createdAt) && (
          <div className="mt-2 space-y-1">
            {filename && (
              <p className="text-xs text-foreground/60 truncate" title={filename}>
                {filename}
              </p>
            )}
            {createdAt && (
              <p className="text-xs text-foreground/40">
                {formatImageDate(createdAt)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Full Size Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="4xl"
        placement="center"
        className="mx-4"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <span className="text-lg font-semibold">
              {type === "generated" ? "Generated Image" : "Uploaded Image"}
            </span>
            {modalData.createdAt && (
              <Chip size="sm" variant="flat">
                {formatImageDate(modalData.createdAt)}
              </Chip>
            )}
          </ModalHeader>

          <ModalBody className="p-0">
            <>
              {/* Image */}
              <div className="flex min-h-[400px] items-center justify-center bg-black/5 dark:bg-black/20">
                <Image
                  src={modalData.src}
                  alt={modalData.alt}
                  width={800}
                  height={600}
                  className="max-h-[70vh] w-auto object-contain"
                  unoptimized
                />
              </div>

              {/* Prompt section - only show for generated images with prompts */}
              {type === "generated" && modalData.prompt && modalData.prompt.trim() && (
                <div className="border-t border-divider/20 bg-content1/50 px-6 py-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-default-600">Prompt</h4>
                    <p className="text-sm leading-relaxed text-foreground">
                      {modalData.prompt}
                    </p>
                  </div>
                </div>
              )}

              {/* Filename section - only show for uploaded images */}
              {type === "uploaded" && modalData.filename && (
                <div className="border-t border-divider/20 bg-content1/50 px-6 py-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-default-600">File</h4>
                    <p className="text-sm leading-relaxed text-foreground">
                      {modalData.filename}
                    </p>
                  </div>
                </div>
              )}
            </>
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onPress={() => setIsModalOpen(false)}>
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
});

ImageViewer.displayName = "ImageViewer";

export default ImageViewer;