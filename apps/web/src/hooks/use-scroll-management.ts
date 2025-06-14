import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useCallback, useEffect, useRef, useState } from "react";

export const useScrollManagement = (messagesLength: number) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useChatScroll(messagesLength);
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
  }, [messagesEndRef]);

  return {
    messagesContainerRef,
    messagesEndRef,
    showScrollToBottom,
    scrollToBottom,
  };
};
