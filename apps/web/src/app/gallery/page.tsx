"use client";

import { useSidebarContext } from "@/components/app-shell";
import { useGeneratedImages } from "@/hooks/queries/use-generated-images";
import { useAuth } from "@/hooks/useAuth";
import { type GeneratedImage } from "@/services/generated-images";
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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface ImageModalData {
  id: string;
  publicUrl: string;
  created_at: string;
  prompt: string;
}

export default function GalleryPage() {
  const { isSidebarOpen } = useSidebarContext();
  const { user, loading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<ImageModalData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState<Set<string>>(new Set());

  const { images, error, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, isError } =
    useGeneratedImages({
      pageSize: 12,
    });

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isAuthLoading, router]);

  const handleImageClick = useCallback((image: GeneratedImage) => {
    setSelectedImage({
      id: image.id,
      publicUrl: image.publicUrl,
      created_at: image.created_at,
      prompt: image.prompt,
    });
    setIsModalOpen(true);
  }, []);

  const handleDownload = useCallback(async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const sanitizedPrompt =
        prompt
          .substring(0, 50) // Truncate
          .trim()
          .replace(/[^a-z0-9 -]/gi, "") // Sanitize
          .replace(/\s+/g, "_") // Replace spaces
          .toLowerCase() || "generated-image";

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${sanitizedPrompt}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  }, []);

  const handleImageError = useCallback((imageId: string) => {
    setImageError((prev) => new Set(prev).add(imageId));
  }, []);

  const formatImageDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    // If less than 24 hours ago, show relative time
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, "MMM d");
    }

    // Otherwise show full date
    return format(date, "MMM d, yyyy");
  }, []);

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden border-divider bg-content1 ${isSidebarOpen ? "lg:rounded-tl-2xl lg:border-l lg:border-t" : ""}`}
    >
      {/* Header */}
      <div className="border-b border-divider px-6 py-6">
        <div className="mx-auto max-w-5xl pl-20 lg:pl-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Generated Images</h1>
          <p className="text-muted-foreground mt-2">
            Browse all the images you have generated with AI. Click any image to view full size.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="mx-auto max-w-5xl">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-muted-foreground mt-4 text-sm">Loading images...</p>
              </div>
            </div>
          )}

          {isError && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 text-red-500">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zM9 15h.008v.008H9v-.008z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-foreground">Error loading images</h3>
                <p className="mt-2 text-sm text-red-500">{(error as Error).message}</p>
              </div>
            </div>
          )}

          {!isLoading && !isError && images.length === 0 && (
            <div className="flex min-h-96 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-20 w-20 text-default-300">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                    />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-medium text-foreground">No images found</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  You haven&apos;t generated any images yet. Start a chat and ask me to generate an
                  image!
                </p>
              </div>
            </div>
          )}

          {!isLoading && !isError && images.length > 0 && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {images.map((image) => {
                  return (
                    <div key={image.id} className="group relative">
                      <div className="relative overflow-hidden rounded-xl border border-divider/20 bg-content1 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:ring-2 group-hover:ring-primary/60">
                        {/* Image */}
                        <div
                          className="aspect-square w-full cursor-pointer overflow-hidden bg-content2"
                          onClick={() => handleImageClick(image)}
                        >
                          {imageError.has(image.id) ? (
                            <div className="flex h-full w-full items-center justify-center bg-content2">
                              <div className="flex flex-col items-center gap-2 text-default-400">
                                <svg
                                  className="h-8 w-8"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
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
                            <Image
                              src={image.publicUrl}
                              alt={image.prompt}
                              width={300}
                              height={300}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={() => handleImageError(image.id)}
                              unoptimized
                            />
                          )}
                        </div>

                        {/* Action buttons - subtle, positioned in top right */}
                        <div className="absolute right-4 top-4 flex items-center gap-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <Tooltip content="View full size" delay={300}>
                            <Button
                              size="sm"
                              variant="light"
                              isIconOnly
                              className="h-9 w-9 bg-content1/90 shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-content1"
                              onPress={() => handleImageClick(image)}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Download image" delay={300}>
                            <Button
                              size="sm"
                              variant="light"
                              isIconOnly
                              className="h-9 w-9 bg-content1/90 shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-content1"
                              onPress={() => handleDownload(image.publicUrl, image.prompt)}
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                        </div>

                        {/* Info bar */}
                        <div className="border-t border-divider/10 px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span
                              className="truncate text-xs font-medium text-foreground"
                              title={image.prompt}
                            >
                              {image.prompt}
                            </span>
                            <Chip size="sm" variant="flat" className="text-xs">
                              {formatImageDate(image.created_at)}
                            </Chip>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasNextPage && (
                <div className="flex justify-center pt-8">
                  <Button
                    color="primary"
                    variant="flat"
                    size="lg"
                    onPress={() => fetchNextPage()}
                    isLoading={isFetchingNextPage}
                    className="px-8"
                  >
                    {isFetchingNextPage ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
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
            <span className="text-lg font-semibold">Generated Image</span>
            {selectedImage && (
              <Chip size="sm" variant="flat">
                {formatImageDate(selectedImage.created_at)}
              </Chip>
            )}
          </ModalHeader>

          <ModalBody className="p-0">
            {selectedImage && (
              <>
                {/* Image */}
                <div className="flex min-h-[400px] items-center justify-center bg-black/5 dark:bg-black/20">
                  <Image
                    src={selectedImage.publicUrl}
                    alt={selectedImage.prompt}
                    width={800}
                    height={600}
                    className="max-h-[70vh] w-auto object-contain"
                    unoptimized
                  />
                </div>

                {/* Prompt section below image */}
                {selectedImage.prompt && selectedImage.prompt.trim() && (
                  <div className="border-t border-divider/20 bg-content1/50 px-6 py-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-default-600">Prompt</h4>
                      <p className="text-sm leading-relaxed text-foreground">
                        {selectedImage.prompt}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onPress={() => setIsModalOpen(false)}>
              Close
            </Button>
            {selectedImage && (
              <Button
                color="primary"
                startContent={<ArrowDownTrayIcon className="h-4 w-4" />}
                onPress={() => handleDownload(selectedImage.publicUrl, selectedImage.prompt)}
              >
                Download
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
