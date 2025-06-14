"use client";

import Image from "next/image";
import { memo } from "react";

interface SecureFileDisplayProps {
  url?: string;
  mimeType: string;
  fileName?: string;
  isImage?: boolean;
}

const SecureFileDisplay = memo(({ url, mimeType, fileName, isImage }: SecureFileDisplayProps) => {
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
      <div className="mb-3 max-w-sm overflow-hidden rounded-lg bg-default-100 dark:bg-default-50">
        <Image
          src={url}
          alt={fileName || "Attached image"}
          width={300}
          height={200}
          className="h-auto w-full object-cover"
          unoptimized
        />
        {fileName && (
          <div className="px-3 py-2">
            <span className="text-xs text-default-600">{fileName}</span>
          </div>
        )}
      </div>
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
      </div>
    </div>
  );
});

SecureFileDisplay.displayName = "SecureFileDisplay";

export { SecureFileDisplay };
export type { SecureFileDisplayProps };
