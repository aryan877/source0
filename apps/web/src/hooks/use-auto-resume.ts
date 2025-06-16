"use client";

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
}

export function useAutoResume({
  autoResume,
  initialMessages,
  experimental_resume,
  data,
  setMessages,
  messagesLoading,
}: Props) {
  const resumeAttempted = useRef(false);

  useEffect(() => {
    if (!autoResume || messagesLoading || resumeAttempted.current) {
      return;
    }

    const mostRecentMessage = initialMessages.at(-1);

    if (mostRecentMessage?.role === "user") {
      console.log("Attempting to resume chat stream...");
      experimental_resume();
    }

    // Mark as attempted once we have checked, to avoid re-triggering
    if (initialMessages.length > 0) {
      resumeAttempted.current = true;
    }
  }, [autoResume, initialMessages, experimental_resume, messagesLoading]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const dataPart = data[0] as DataPart;

    if (dataPart.type === "append-message") {
      const message = JSON.parse(dataPart.message) as UIMessage;
      setMessages([...initialMessages, message]);
    }
  }, [data, initialMessages, setMessages]);
}
