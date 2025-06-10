import { useEffect, useRef } from "react";

/**
 * Custom hook for auto-scrolling chat interfaces
 * Automatically scrolls to the bottom when the dependency changes (e.g., new messages)
 *
 * @param dependency - Value to watch for changes (typically messages.length)
 * @param options - Optional ScrollIntoViewOptions to customize scroll behavior
 * @returns React ref to attach to the scroll target element
 *
 * @example
 * ```tsx
 * const messagesEndRef = useChatScroll(messages.length);
 *
 * return (
 *   <div>
 *     {messages.map(msg => <Message key={msg.id} {...msg} />)}
 *     <div ref={messagesEndRef} />
 *   </div>
 * );
 * ```
 */
export const useChatScroll = <T>(dependency: T, options?: ScrollIntoViewOptions) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
        ...options,
      });
    }
  }, [dependency, options]);

  return ref;
};
