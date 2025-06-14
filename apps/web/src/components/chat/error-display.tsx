"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { memo } from "react";

interface ErrorDisplayProps {
  error?: Error;
  uiError?: string | null;
  onDismissUiError: () => void;
}

export const ErrorDisplay = memo(({ error, uiError, onDismissUiError }: ErrorDisplayProps) => {
  if (!error && !uiError) return null;

  let errorTitle = "Error";
  let errorMessage: string | undefined = error?.message;

  if (error?.message) {
    const match = error.message.match(/^\[([^\]]+)\]\s*(.*)$/s);
    if (match) {
      errorTitle = match[1] || "Error";
      errorMessage = match[2] || "An unexpected error occurred.";
    }
  }

  return (
    <div className="w-full max-w-full">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-danger" />
              <p className="text-sm font-medium text-danger">{error ? errorTitle : "Notice"}</p>
            </div>

            {errorMessage && (
              <p className="mb-2 text-xs leading-relaxed text-danger/80">{errorMessage}</p>
            )}
            {uiError && <p className="mb-2 text-xs leading-relaxed text-danger/80">{uiError}</p>}

            {error && (
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onPress={() => {
                  /* A retry function would be needed here */
                }}
                className="h-7 px-3 text-xs"
              >
                Retry
              </Button>
            )}
          </div>

          {uiError && !error && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              color="danger"
              onPress={onDismissUiError}
              aria-label="Dismiss error"
              className="h-6 w-6 min-w-0 flex-shrink-0"
            >
              <XMarkIcon className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

ErrorDisplay.displayName = "ErrorDisplay";
