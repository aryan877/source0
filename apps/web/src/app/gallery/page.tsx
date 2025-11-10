"use client";

import { useSidebarContext } from "@/components/app-shell";
import ImageViewer from "@/components/shared/image-viewer";
import { useGeneratedImages } from "@/hooks/queries/use-generated-images";
import { useAuth } from "@/hooks/use-auth";
import { Button, Chip } from "@heroui/react";
import { format, formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

export default function GalleryPage() {
  const { isSidebarOpen } = useSidebarContext();
  const { user, loading: isAuthLoading } = useAuth();
  const router = useRouter();

  const { images, error, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, isError } =
    useGeneratedImages({
      pageSize: 12,
    });

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isAuthLoading, router]);


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
                        {/* ImageViewer with info bar */}
                        <div className="aspect-square">
                          <ImageViewer
                            src={image.publicUrl}
                            alt={image.prompt}
                            prompt={image.prompt}
                            createdAt={image.created_at ?? undefined}
                            type="generated"
                            size="small"
                            onDownload={handleDownload}
                            className="h-full w-full"
                          />
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
                              {formatImageDate(image.created_at ?? new Date().toISOString())}
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

    </div>
  );
}
