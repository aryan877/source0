import { type Message } from "@ai-sdk/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const SCROLL_THRESHOLD = 100;

interface UseChatScrollManagerProps {
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  messages: Message[];
  chatId: string;
}

export function useChatScrollManager({
  chatContainerRef,
  messages,
  chatId,
}: UseChatScrollManagerProps) {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [justSubmittedMessageId, setJustSubmittedMessageId] = useState<string | null>(null);
  const prevChatId = useRef(chatId);
  const initialLoad = useRef(true);

  const scrollToBottom = useCallback(
    (behavior: "smooth" | "auto" = "smooth") => {
      const container = chatContainerRef.current;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      }
    },
    [chatContainerRef]
  );

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < SCROLL_THRESHOLD;
      setShowScrollToBottom(!isAtBottom && container.scrollTop > 0);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [chatContainerRef]);

  // Scroll on initial load or chat change
  useLayoutEffect(() => {
    const chatHasChanged = chatId !== prevChatId.current;
    if (chatHasChanged) {
      prevChatId.current = chatId;
      initialLoad.current = true;
    }

    if (initialLoad.current && messages.length > 0) {
      scrollToBottom("auto");
      initialLoad.current = false;
    }
  }, [messages, chatId, scrollToBottom]);

  // Scroll when user submits a message
  useLayoutEffect(() => {
    if (justSubmittedMessageId) {
      const container = chatContainerRef.current;
      if (container) {
        const messageElement = container.querySelector(
          `[data-message-id="${justSubmittedMessageId}"]`
        );
        if (messageElement) {
          scrollToBottom("auto");
          setJustSubmittedMessageId(null);
        }
      }
    }
  }, [justSubmittedMessageId, messages, chatContainerRef, scrollToBottom]);

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  return { showScrollToBottom, scrollToBottom: handleScrollToBottom, setJustSubmittedMessageId };
}
