"use client";

import { createSignedUrl } from "@/utils/supabase/storage";
import Image from "next/image";
import { memo, useEffect, useState } from "react";

interface SecureFileDisplayProps {
  filePath?: string;
  fallbackUrl?: string;
  mimeType: string;
  fileName?: string;
  isImage?: boolean;
}

const SecureFileDisplay = memo(
  ({ filePath, fallbackUrl, mimeType, fileName, isImage }: SecureFileDisplayProps) => {
    const [secureUrl, setSecureUrl] = useState<string | null>(fallbackUrl || null);
    const [loading, setLoading] = useState(!!filePath);
    const [error, setError] = useState(false);

    useEffect(() => {
      if (!filePath) return;

      const generateSecureUrl = async () => {
        try {
          setLoading(true);
          const signedUrl = await createSignedUrl(filePath, 3600); // 1 hour expiry
          if (signedUrl) {
            setSecureUrl(signedUrl);
          } else {
            setError(true);
          }
        } catch (err) {
          console.error("Failed to generate signed URL:", err);
          setError(true);
        } finally {
          setLoading(false);
        }
      };

      generateSecureUrl();
    }, [filePath]);

    if (loading) {
      return (
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-divider bg-gradient-to-r from-content1 to-content1/80 p-4 shadow-sm">
          <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-lg bg-content2 text-xl shadow-sm">
            📎
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-foreground">Loading file...</span>
            <span className="text-sm text-default-500">{mimeType}</span>
          </div>
        </div>
      );
    }

    if (error || !secureUrl) {
      return (
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-danger/30 bg-danger/5 p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-danger/20 text-xl shadow-sm">
            ❌
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-danger">File unavailable</span>
            <span className="text-sm text-danger/70">Unable to load secure file</span>
          </div>
        </div>
      );
    }

    if (isImage && mimeType.startsWith("image/")) {
      return (
        <div className="mb-4 max-w-md overflow-hidden rounded-xl border border-divider shadow-lg transition-transform hover:scale-105">
          <Image
            src={secureUrl}
            alt={fileName || "Attached image"}
            width={500}
            height={350}
            className="h-auto w-full rounded-xl object-cover"
            unoptimized
          />
        </div>
      );
    }

    return (
      <div className="mb-4 flex items-center gap-4 rounded-xl border border-divider bg-gradient-to-r from-content1 to-content1/80 p-4 shadow-sm transition-all hover:scale-105 hover:shadow-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-content2 text-xl shadow-sm">
          📎
        </div>
        <div className="flex min-w-0 flex-col">
          <a
            href={secureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-medium text-foreground hover:text-primary"
          >
            {fileName || "File attachment"}
          </a>
          <span className="text-sm text-default-500">{mimeType}</span>
        </div>
      </div>
    );
  }
);

SecureFileDisplay.displayName = "SecureFileDisplay";

export { SecureFileDisplay };
export type { SecureFileDisplayProps };
