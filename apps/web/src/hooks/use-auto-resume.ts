"use client";

import { getLatestStreamIdWithStatus } from "@/services";
import { type UseChatHelpers } from "@ai-sdk/react";
import { type Message as UIMessage } from "ai";
import { useEffect } from "react";

export type DataPart = { type: "append-message"; message: string };

export interface Props {
  autoResume: boolean;
  initialMessages: UIMessage[];
  messages: UIMessage[];
  experimental_resume: UseChatHelpers["experimental_resume"];
  data: UseChatHelpers["data"];
  setMessages: UseChatHelpers["setMessages"];
  chatId?: string;
}

export function useAutoResume({
  autoResume,
  initialMessages,
  messages,
  experimental_resume,
  data,
  setMessages,
  chatId,
}: Props) {
  useEffect(() => {
    if (!autoResume) return;

    // Don't resume if useChat hook hasn't initialized its messages yet
    // We check if messages length matches initialMessages (useChat has loaded them)
    if (messages.length === 0 && initialMessages.length > 0) return;

    const mostRecentMessage = messages.at(-1);

    if (mostRecentMessage?.role !== "user") {
      return;
    }

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

    // we include messages.length to re-run when useChat initializes its messages
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Handle append-message data parts for resumable streams
  useEffect(() => {
    if (!data || data.length === 0) return;

    const dataPart = data[0] as DataPart;

    if (dataPart.type === "append-message") {
      console.log("Processing append-message data part");
      const message = JSON.parse(dataPart.message) as UIMessage;
      if (!messages.find((m) => m.id === message.id)) {
        setMessages([...messages, message]);
      }
    }
  }, [data, messages, setMessages]);
}
