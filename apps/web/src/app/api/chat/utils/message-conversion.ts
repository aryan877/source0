import { type Tables } from "@/types/supabase-types";
import {
  type ModelMessage,
  type UIMessage,
  convertToModelMessages as sdkConvertToModelMessages,
} from "ai";

/**
 * Converts database messages to UI messages, ensuring parts are correctly typed.
 */
export function convertDbMessagesToUiMessages(dbMessages: Tables<"chat_messages">[]): UIMessage[] {
  return dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    parts: (msg.parts as UIMessage["parts"]) || [],
  }));
}

/**
 * A wrapper around the AI SDK's convertToModelMessages for sending to LLMs.
 * In AI SDK v5, UIMessages are the source of truth for persistence.
 * Only convert to ModelMessages when sending to the LLM.
 */
export function convertToModelMessages(messages: UIMessage | UIMessage[]): ModelMessage[] {
  const messageArray = Array.isArray(messages) ? messages : [messages];
  return sdkConvertToModelMessages(messageArray);
}
