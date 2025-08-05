import { type Tables } from "@/types/supabase-types";
import { type ModelMessage, type UIMessage, convertToModelMessages } from "ai";

export function convertDbMessagesToUiMessages(dbMessages: Tables<"chat_messages">[]): UIMessage[] {
  return dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    parts: (msg.parts as UIMessage["parts"]) || [],
  }));
}

export function processMessages(messages: UIMessage[]): {
  coreMessages: ModelMessage[];
  userMessageToSave: UIMessage | undefined;
} {
  const userMessageToSave = messages.at(-1);

  const modelMessages = convertToModelMessages(messages);

  return {
    coreMessages: modelMessages,
    userMessageToSave: userMessageToSave,
  };
}
