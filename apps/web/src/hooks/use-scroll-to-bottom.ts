import { useCallback, useEffect, useRef, useState } from "react";

const SCROLL_ANIMATION_DURATION = 500; // ms, for smooth scroll
const USER_SCROLLED_THRESHOLD = 100; // In pixels from bottom to detect user has scrolled up

interface UseScrollToBottomOptions {
  isLoadingMessages: boolean;
  messagesLength: number;
}

export function useScrollToBottom({ isLoadingMessages, messagesLength }: UseScrollToBottomOptions) {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const userScrolled = useRef(false);
  const programmaticScroll = useRef(false);

  const handleScrollToBottom = useCallback((container: HTMLElement) => {
    if (!container) return;

    programmaticScroll.current = true;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });

    setTimeout(() => {
      programmaticScroll.current = false;
      setShowScrollToBottom(false);
      userScrolled.current = false;
    }, SCROLL_ANIMATION_DURATION);
  }, []);

  const checkScrollPosition = useCallback((container: HTMLElement) => {
    if (programmaticScroll.current) return;

    const isAtBottom =
      container.scrollHeight - container.clientHeight <=
      container.scrollTop + USER_SCROLLED_THRESHOLD;

    const hasScrollableContent = container.scrollHeight > container.clientHeight;

    if (isAtBottom || !hasScrollableContent) {
      userScrolled.current = false;
      setShowScrollToBottom(false);
    } else {
      userScrolled.current = true;
      setShowScrollToBottom(true);
    }
  }, []);

  const setupScrollListener = useCallback(
    (container: HTMLElement) => {
      const handleScroll = () => checkScrollPosition(container);

      // Initial check when listener is set up
      handleScroll();

      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    },
    [checkScrollPosition]
  );

  // Initial check for scroll-to-bottom button visibility when messages load
  useEffect(() => {
    if (isLoadingMessages) return;

    // Small delay to ensure layout is complete
    const timeoutId = setTimeout(() => {
      // This will be handled by the component when it gets the container ref
      setShowScrollToBottom(false); // Reset state
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isLoadingMessages, messagesLength]);

  return {
    showScrollToBottom,
    userScrolled: userScrolled.current,
    programmaticScroll: programmaticScroll.current,
    handleScrollToBottom,
    setupScrollListener,
    checkScrollPosition,
    setUserScrolled: (value: boolean) => {
      userScrolled.current = value;
    },
    setProgrammaticScroll: (value: boolean) => {
      programmaticScroll.current = value;
    },
  };
}
