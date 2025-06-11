import type { UIMessage } from "ai";
import { useRef } from "react";

function useMemoizedParts(message: UIMessage) {
  const cache = useRef({
    messageId: "",
    hasReasoning: false,
    hasText: false,
    checkedLength: 0,
  });

  if (cache.current.messageId !== message.id) {
    cache.current = {
      messageId: message.id,
      hasReasoning: false,
      hasText: false,
      checkedLength: 0,
    };
  }

  const parts = message.parts || [];
  const currentLength = parts.length;
  const { checkedLength } = cache.current;

  if (currentLength > checkedLength) {
    const newParts = parts.slice(checkedLength);

    if (!cache.current.hasText) {
      cache.current.hasText = newParts.some((p) => p.type === "text");
    }

    if (!cache.current.hasReasoning) {
      cache.current.hasReasoning = newParts.some((p) => p.type === "reasoning");
    }

    cache.current.checkedLength = currentLength;
  }

  return {
    hasReasoningPart: cache.current.hasReasoning,
    hasTextPart: cache.current.hasText,
  };
}

interface UseReasoningSpinnerOptions {
  message: UIMessage;
  isLoading: boolean;
}

export function useReasoningSpinner({ message, isLoading }: UseReasoningSpinnerOptions) {
  const { hasReasoningPart, hasTextPart } = useMemoizedParts(message);

  const isReasoningStreaming = isLoading && hasReasoningPart && !hasTextPart;

  return {
    isReasoningStreaming,
    hasTextPart,
    hasReasoningPart,
  };
}
