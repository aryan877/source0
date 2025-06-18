import { useCallback, useRef, useState } from "react";

const SCROLL_ANIMATION_DURATION = 500; // ms, for smooth scroll
const USER_SCROLLED_THRESHOLD = 200; // Larger threshold - user must scroll up significantly before button appears

export function useScrollToBottom() {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const programmaticScroll = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);

  const isAtBottom = useCallback((container: HTMLElement): boolean => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - clientHeight - scrollTop <= USER_SCROLLED_THRESHOLD;
  }, []);

  const hasScrollableContent = useCallback((container: HTMLElement): boolean => {
    return container.scrollHeight > container.clientHeight;
  }, []);

  const updateScrollState = useCallback(
    (container: HTMLElement) => {
      if (programmaticScroll.current) return;

      const atBottom = isAtBottom(container);
      const hasContent = hasScrollableContent(container);

      if (!hasContent) {
        setUserScrolled(false);
        setShowScrollToBottom(false);
      } else if (atBottom) {
        setUserScrolled(false);
        setShowScrollToBottom(false);
      } else {
        setUserScrolled(true);
        setShowScrollToBottom(true);
      }
    },
    [isAtBottom, hasScrollableContent]
  );

  const handleScrollToBottom = useCallback(
    (container: HTMLElement) => {
      if (!container) return;

      programmaticScroll.current = true;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });

      setTimeout(() => {
        programmaticScroll.current = false;
        if (containerRef.current) {
          updateScrollState(containerRef.current);
        }
      }, SCROLL_ANIMATION_DURATION);
    },
    [updateScrollState]
  );

  const setupScrollListener = useCallback(
    (container: HTMLElement) => {
      containerRef.current = container;

      const handleScroll = () => {
        updateScrollState(container);
      };

      container.addEventListener("scroll", handleScroll, { passive: true });

      // Initial state update
      updateScrollState(container);

      return () => {
        container.removeEventListener("scroll", handleScroll);
        containerRef.current = null;
      };
    },
    [updateScrollState]
  );

  const checkScrollPosition = useCallback(
    (container: HTMLElement) => {
      updateScrollState(container);
    },
    [updateScrollState]
  );

  const setProgrammaticScroll = useCallback((value: boolean) => {
    programmaticScroll.current = value;
  }, []);

  return {
    showScrollToBottom,
    userScrolled,
    programmaticScroll: programmaticScroll.current,
    handleScrollToBottom,
    setupScrollListener,
    checkScrollPosition,
    setUserScrolled,
    setProgrammaticScroll,
  };
}
