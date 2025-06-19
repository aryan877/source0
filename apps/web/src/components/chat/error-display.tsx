"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { memo } from "react";

interface ErrorDisplayProps {
  error?: Error;
  uiError?: string | null;
  onDismissUiError: () => void;
  onRetry?: () => void;
  isMessageError?: boolean;
}

export const ErrorDisplay = memo(
  ({ error, uiError, onDismissUiError, onRetry, isMessageError = false }: ErrorDisplayProps) => {
    const effectiveError = uiError || error?.message;

    if (!effectiveError) {
      return null;
    }

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
      <div
        className={`relative rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger-600 shadow-lg backdrop-blur-sm ${
          isMessageError ? "w-full" : "max-w-full"
        }`}
      >
        {/* Dismiss button - positioned absolutely in top-right */}
        {uiError && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="danger"
            onPress={onDismissUiError}
            aria-label="Dismiss error"
            className="absolute right-2 top-2 h-6 w-6 min-w-0"
          >
            <XMarkIcon className="h-3 w-3" />
          </Button>
        )}

        {/* Main content */}
        <div className="flex flex-col gap-3 pr-8">
          {/* Header with icon and title */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 flex-shrink-0 rounded-full bg-danger" />
            <p className="text-sm font-medium text-danger">{error ? errorTitle : "Notice"}</p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <p className="pl-4 text-xs leading-relaxed text-danger/80">{errorMessage}</p>
          )}
          {uiError && <p className="pl-4 text-xs leading-relaxed text-danger/80">{uiError}</p>}

          {/* Retry button */}
          {error && onRetry && (
            <div className="flex justify-start pl-4">
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onPress={onRetry}
                className="h-7 px-3 text-xs"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ErrorDisplay.displayName = "ErrorDisplay";
