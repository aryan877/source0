import type { Message } from "ai";
import { useRef } from "react";

/**
 * This hook uses a ref to memoize the results of checking message parts.
 * It avoids re-scanning the entire `parts` array on every render,
 * which is crucial for performance during rapid streaming updates.
 * It only scans new parts of the message that have arrived since the last render.
 */
function useMemoizedParts(message: Message) {
  const cache = useRef({
    messageId: "",
    hasReasoning: false,
    hasText: false,
    checkedLength: 0,
  });

  // Reset cache for new messages
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

  // Only check new parts since last render
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
  message: Message;
  isLoading: boolean;
}

export function useReasoningSpinner({ message, isLoading }: UseReasoningSpinnerOptions) {
  const { hasReasoningPart, hasTextPart } = useMemoizedParts(message);

  // Show spinner when loading with reasoning but no text yet
  const isReasoningStreaming = isLoading && hasReasoningPart && !hasTextPart;

  return {
    isReasoningStreaming,
    hasTextPart,
    hasReasoningPart,
  };
}
