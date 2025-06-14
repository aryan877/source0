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
      <div className="absolute -top-12 left-1/2 z-10 -translate-x-1/2">
        <Button
          isIconOnly
          size="sm"
          radius="full"
          className="bg-content1/80 shadow-md backdrop-blur-md"
          onPress={onScrollToBottom}
          aria-label="Scroll to bottom"
        >
          <ArrowDownIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);

ScrollToBottomButton.displayName = "ScrollToBottomButton";
