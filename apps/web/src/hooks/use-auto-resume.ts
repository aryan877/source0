"use client";

import { getLatestStreamIdWithStatus } from "@/services";
import { type UseChatHelpers } from "@ai-sdk/react";
import { type Message as UIMessage } from "ai";
import { useCallback, useEffect } from "react";

export type DataPart = { type: "append-message"; message: string };

export interface Props {
  autoResume: boolean;
  initialMessages: UIMessage[];
  experimental_resume: UseChatHelpers["experimental_resume"];
  data: UseChatHelpers["data"];
  setMessages: UseChatHelpers["setMessages"];
  chatId?: string;
}

export function useAutoResume({
  autoResume,
  initialMessages,
  experimental_resume,
  data,
  setMessages,
  chatId,
}: Props) {
  const tryResume = useCallback(() => {
    if (!chatId) {
      console.log("Auto-resume skipped: no chatId");
      return;
    }

    // Check if the most recent stream was cancelled before attempting resume
    getLatestStreamIdWithStatus(chatId)
      .then((streamStatus) => {
        if (!streamStatus) {
          console.log("No stream found for this chat, skipping resume.");
          return;
        }

        if (streamStatus.cancelled) {
          console.log("Most recent stream was cancelled, skipping resume");
          return;
        }

        if (streamStatus.complete) {
          console.log("Most recent stream was completed, skipping resume.");
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
  }, [chatId, experimental_resume]);

  // Auto-execute resume logic once on mount when autoResume is true
  useEffect(() => {
    if (!autoResume) {
      console.log("Auto-resume disabled");
      return;
    }

    tryResume();

    // we intentionally run this once with empty dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle append-message data parts for resumable streams
  useEffect(() => {
    if (!data || data.length === 0) return;

    const dataPart = data[0] as DataPart;

    if (dataPart.type === "append-message") {
      console.log("Processing append-message data part");
      const message = JSON.parse(dataPart.message) as UIMessage;
      setMessages([...initialMessages, message]);
    }
  }, [data, initialMessages, setMessages]);
}
