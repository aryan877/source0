"use client";

import { getLatestStreamIdWithStatus } from "@/services";
import { type UseChatHelpers } from "@ai-sdk/react";
import { type Message as UIMessage } from "ai";
import { useCallback } from "react";

export type DataPart = { type: "append-message"; message: string };

export interface Props {
  initialMessages: UIMessage[];
  experimental_resume: UseChatHelpers["experimental_resume"];
  chatId?: string;
}
export function useAutoResume({ initialMessages, experimental_resume, chatId }: Props) {
  const tryResume = useCallback(() => {
    if (!chatId) {
      return;
    }

    const mostRecentMessage = initialMessages.at(-1);

    if (mostRecentMessage?.role === "user") {
      // Check if the most recent stream was cancelled before attempting resume
      getLatestStreamIdWithStatus(chatId)
        .then((streamStatus) => {
          if (streamStatus?.cancelled) {
            console.log("Most recent stream was cancelled, skipping resume");
            return;
          }

          console.log("Attempting to resume chat stream...");
          experimental_resume();
        })
        .catch((error) => {
          console.error("Error checking stream status for resume:", error);
          // If we can't check, attempt resume anyway (fallback to previous behavior)
          console.log("Attempting to resume chat stream (fallback)...");
          experimental_resume();
        });
    }
  }, [chatId, initialMessages, experimental_resume]);

  return { tryResume };
}
