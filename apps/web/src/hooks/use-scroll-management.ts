import { useCallback, useEffect, useRef, useState } from "react";

export const useScrollManagement = () => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const threshold = 200;
    const isScrolledUp =
      container.scrollHeight - container.scrollTop - container.clientHeight > threshold;
    setShowScrollToBottom(isScrolledUp);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToBottom = useCallback(() => {
    const element = messagesEndRef.current;
    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, []);

  return {
    messagesContainerRef,
    messagesEndRef,
    showScrollToBottom,
    scrollToBottom,
  };
};
