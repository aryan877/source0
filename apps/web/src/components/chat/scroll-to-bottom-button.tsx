"use client";

import { ArrowDownIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { memo } from "react";

interface ScrollToBottomButtonProps {
  showScrollToBottom: boolean;
  onScrollToBottom: () => void;
}

export const ScrollToBottomButton = memo(
  ({ showScrollToBottom, onScrollToBottom }: ScrollToBottomButtonProps) => {
    if (!showScrollToBottom) return null;

    return (
      <div className="absolute -top-14 left-1/2 z-30 -translate-x-1/2">
        <Button
          size="sm"
          radius="full"
          className="border border-default-200 bg-content1/90 shadow-lg backdrop-blur-md"
          onPress={onScrollToBottom}
          aria-label="Scroll to bottom"
          startContent={<ArrowDownIcon className="h-4 w-4" />}
        >
          Scroll to bottom
        </Button>
      </div>
    );
  }
);

ScrollToBottomButton.displayName = "ScrollToBottomButton";
