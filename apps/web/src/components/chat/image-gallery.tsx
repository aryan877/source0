"use client";

import { ArrowDownTrayIcon, EyeIcon } from "@heroicons/react/24/outline";
import { Button, Tooltip } from "@heroui/react";
import Image from "next/image";
import { memo, useCallback } from "react";
import type { ImageGenerationToolData } from "@/types/tools";

interface ImageData {
  url: string;
  prompt: string;
}

interface ImageGalleryProps {
  images: ImageData[];
  onImageClick: (url: string, prompt: string) => void;
  onDownload: (url: string, prompt: string) => void;
}

const ImageGallery = memo(({ images, onImageClick, onDownload }: ImageGalleryProps) => {
  const getGridClass = useCallback((count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-2";
    return "grid-cols-2";
  }, []);

  const getImageClass = useCallback((count: number, index: number) => {
    if (count === 1) return "aspect-square max-w-md";
    if (count === 2) return "aspect-square";
    if (count === 3 && index === 0) return "col-span-2 aspect-[2/1]";
    if (count === 3) return "aspect-square";
    return "aspect-square";
  }, []);

  if (images.length === 0) return null;

  return (
    <div className="my-4">
      <div className="mb-3 text-sm font-medium text-foreground/80">
        Generated Image{images.length > 1 ? 's' : ''}
      </div>
      <div className={`grid gap-2 ${getGridClass(images.length)} max-w-lg`}>
        {images.map((image, index) => (
          <div
            key={index}
            className={`group/image relative overflow-hidden rounded-lg bg-content1 shadow-sm transition-all duration-300 hover:shadow-lg ${getImageClass(images.length, index)}`}
          >
            <Image
              src={image.url}
              alt={image.prompt}
              width={400}
              height={400}
              className="h-full w-full cursor-pointer object-cover transition-transform duration-300 group-hover/image:scale-105"
              onClick={() => onImageClick(image.url, image.prompt)}
              unoptimized
            />
            
            {/* Action buttons overlay */}
            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/image:opacity-100">
              <Tooltip content="View full size" delay={300}>
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  className="h-7 w-7 bg-black/50 text-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-black/60"
                  onPress={() => onImageClick(image.url, image.prompt)}
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
              <Tooltip content="Download" delay={300}>
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  className="h-7 w-7 bg-black/50 text-white shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-black/60"
                  onPress={() => onDownload(image.url, image.prompt)}
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
            </div>

            {/* Image count indicator for multiple images */}
            {images.length > 1 && (
              <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">
                {index + 1}/{images.length}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

ImageGallery.displayName = "ImageGallery";

export default ImageGallery;