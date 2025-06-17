import { useCallback, useRef, useState } from "react";

export const useScrollManagement = () => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const isAtBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const threshold = 50; // A small threshold for being "at the bottom"
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;

    isAtBottomRef.current = isAtBottom;

    // Show the button only if the user has scrolled up a fair amount
    const hasScrolledUp =
      container.scrollHeight - container.scrollTop - container.clientHeight > 200;
    setShowScrollToBottom(hasScrolledUp);
  }, []);

  const scrollToBottom = useCallback((behavior: "smooth" | "instant" = "smooth") => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, []);

  return {
    messagesContainerRef,
    showScrollToBottom,
    isAtBottomRef,
    scrollToBottom,
    handleScroll,
  };
};
