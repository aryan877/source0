import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseReasoningSpinnerOptions {
  message: UIMessage;
  isLoading: boolean;
  timeoutDuration?: number;
}

export function useReasoningSpinner({
  message,
  isLoading,
  timeoutDuration = 1000,
}: UseReasoningSpinnerOptions) {
  const [isReasoningStreaming, setIsReasoningStreaming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReasoningCountRef = useRef(0);
  const lastTextCountRef = useRef(0);

  // Clear timeout helper
  const clearExistingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Check for reasoning and text parts efficiently
  const checkPartsAndUpdateSpinner = useCallback(() => {
    if (!message.parts) {
      setIsReasoningStreaming(false);
      return;
    }

    const reasoningParts = message.parts.filter((part) => part.type === "reasoning");
    const textParts = message.parts.filter((part) => part.type === "text");

    const reasoningCount = reasoningParts.length;
    const textCount = textParts.length;

    // Only update if counts have changed to avoid unnecessary re-renders
    if (
      reasoningCount !== lastReasoningCountRef.current ||
      textCount !== lastTextCountRef.current
    ) {
      lastReasoningCountRef.current = reasoningCount;
      lastTextCountRef.current = textCount;

      // Clear any existing timeout
      clearExistingTimeout();

      // Show spinner if:
      // 1. We're loading/streaming
      // 2. We have reasoning parts
      // 3. We don't have text parts yet (reasoning comes before text)
      if (isLoading && reasoningCount > 0 && textCount === 0) {
        setIsReasoningStreaming(true);

        // Set timeout to hide spinner if streaming stalls
        timeoutRef.current = setTimeout(() => {
          setIsReasoningStreaming(false);
        }, timeoutDuration);
      } else {
        // Hide spinner if we have text parts or not loading
        setIsReasoningStreaming(false);
      }
    }
  }, [message.parts, isLoading, timeoutDuration, clearExistingTimeout]);

  // Run the check on every message change, but efficiently
  useEffect(() => {
    checkPartsAndUpdateSpinner();

    // Cleanup on unmount or message change
    return () => {
      clearExistingTimeout();
    };
  }, [checkPartsAndUpdateSpinner, clearExistingTimeout]);

  // Additional cleanup on unmount
  useEffect(() => {
    return () => {
      clearExistingTimeout();
    };
  }, [clearExistingTimeout]);

  return {
    isReasoningStreaming,
    hasTextPart: lastTextCountRef.current > 0,
    hasReasoningPart: lastReasoningCountRef.current > 0,
  };
}
