"use client";

import { memo, useCallback } from "react";
import ImageViewer from "../shared/image-viewer";

interface ImageData {
  url: string;
  prompt: string;
}

interface ImageGalleryProps {
  images: ImageData[];
  onDownload: (url: string, prompt: string) => void;
}

const ImageGallery = memo(({ images, onDownload }: ImageGalleryProps) => {
  const getGridClass = useCallback((count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-2";
    return "grid-cols-2";
  }, []);

  const getSizeConfig = useCallback((count: number, index: number) => {
    if (count === 1) return "medium";
    if (count === 2) return "small";
    if (count === 3 && index === 0) return "medium";
    if (count === 3) return "small";
    return "small";
  }, []);

  if (images.length === 0) return null;

  return (
    <div className="my-4">
      <div className="mb-3 text-sm font-medium text-foreground/80">
        Generated Image{images.length > 1 ? 's' : ''}
      </div>
      <div className={`grid gap-3 ${getGridClass(images.length)} max-w-lg`}>
        {images.map((image, index) => (
          <div
            key={index}
            className={`relative ${images.length === 3 && index === 0 ? "col-span-2" : ""}`}
          >
            <ImageViewer
              src={image.url}
              alt={image.prompt}
              prompt={image.prompt}
              type="generated"
              size={getSizeConfig(images.length, index) as "small" | "medium"}
              onDownload={onDownload}
              className="w-full"
            />
            
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