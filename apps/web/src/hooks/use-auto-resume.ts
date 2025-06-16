"use client";

import { getLatestStreamIdWithStatus } from "@/services";
import { type UseChatHelpers } from "@ai-sdk/react";
import { type Message as UIMessage } from "ai";
import { useEffect, useRef } from "react";

export type DataPart = { type: "append-message"; message: string };

export interface Props {
  autoResume: boolean;
  initialMessages: UIMessage[];
  experimental_resume: UseChatHelpers["experimental_resume"];
  data: UseChatHelpers["data"];
  setMessages: UseChatHelpers["setMessages"];
  messagesLoading: boolean;
  chatId?: string;
}

export function useAutoResume({
  autoResume,
  initialMessages,
  experimental_resume,
  data,
  setMessages,
  messagesLoading,
  chatId,
}: Props) {
  const resumeAttempted = useRef(false);

  useEffect(() => {
    if (!autoResume || messagesLoading || resumeAttempted.current || !chatId) {
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

    // Mark as attempted once we have checked, to avoid re-triggering
    if (initialMessages.length > 0) {
      resumeAttempted.current = true;
    }
  }, [autoResume, initialMessages, experimental_resume, messagesLoading, chatId]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const dataPart = data[0] as DataPart;

    if (dataPart.type === "append-message") {
      const message = JSON.parse(dataPart.message) as UIMessage;
      setMessages([...initialMessages, message]);
    }
  }, [data, initialMessages, setMessages]);
}
