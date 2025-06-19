"use client";

import { type MessageSummary } from "@/services/message-summaries";
import { FileText } from "lucide-react";
import { forwardRef } from "react";

interface ChatNavigatorProps {
  summaries: MessageSummary[];
  onSummaryClick: (messageId: string) => void;
  isOpen: boolean;
}

export const ChatNavigator = forwardRef<HTMLDivElement, ChatNavigatorProps>(function ChatNavigator(
  { summaries, onSummaryClick, isOpen },
  ref
) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-0 z-20 h-full w-full max-w-sm rounded-l-lg border-l border-divider bg-background/95 shadow-lg backdrop-blur-sm"
      style={{
        transition: "transform 0.3s ease-in-out",
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
      }}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-2 border-b border-divider p-4">
          <FileText className="h-5 w-5 text-default-600" />
          <h2 className="text-lg font-semibold text-foreground">Chat Navigator</h2>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {summaries.length === 0 ? (
              <p className="text-center text-sm text-default-500">No summaries available yet.</p>
            ) : (
              <ul className="space-y-2">
                {summaries.map((summary) => (
                  <li
                    key={summary.id}
                    onClick={() => onSummaryClick(summary.message_id)}
                    className="cursor-pointer rounded-lg p-3 transition-colors hover:bg-default-100"
                  >
                    <p className="text-sm font-medium text-foreground">{summary.summary}</p>
                    <time className="text-xs text-default-500">
                      {new Date(summary.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ChatNavigator.displayName = "ChatNavigator";
