import { useCallback, useEffect, useState, type RefObject } from "react";

interface UseScrollToBottomProps {
  containerRef: RefObject<HTMLDivElement | null>;
  messagesLength: number;
}

export function useScrollToBottom({ containerRef, messagesLength }: UseScrollToBottomProps) {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const checkScrollPosition = useCallback((container: HTMLElement) => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200; // 200px threshold
    setShowScrollToBottom(!isNearBottom);
  }, []);

  const handleScroll = useCallback(
    (event: Event) => {
      const container = event.target as HTMLElement;
      if (container) {
        checkScrollPosition(container);
      }
    },
    [checkScrollPosition]
  );

  const scrollToBottom = useCallback(() => {
    const messagesEnd = document.querySelector('[data-messages-end="true"]');
    if (messagesEnd) {
      messagesEnd.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const setupScrollListener = useCallback(
    (container: HTMLElement) => {
      container.addEventListener("scroll", handleScroll, { passive: true });

      // Initial check
      checkScrollPosition(container);

      return () => {
        container.removeEventListener("scroll", handleScroll);
      };
    },
    [handleScroll, checkScrollPosition]
  );

  // Setup scroll listener when container becomes available
  const hasMessages = messagesLength > 0;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    return setupScrollListener(container);
  }, [setupScrollListener, hasMessages, containerRef]);

  // Check scroll position when messages change (for new messages)
  useEffect(() => {
    const container = containerRef.current;
    if (container && messagesLength > 0) {
      requestAnimationFrame(() => {
        checkScrollPosition(container);
      });
    }
  }, [messagesLength, checkScrollPosition, containerRef]);

  return {
    showScrollToBottom,
    scrollToBottom,
  };
}
