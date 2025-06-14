import {
  addMessage,
  createChatSession,
  updateChatSessionTitle,
  type DBChatMessage,
  type MessagePart,
} from "@/utils/supabase/db";
import { createClient } from "@/utils/supabase/server";
import { openai } from "@ai-sdk/openai";
import { generateText, type Message } from "ai";
import { v4 as uuidv4 } from "uuid";

export const getAuthenticatedUser = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
};

export const createOrGetSession = async (supabase: any, userId: string, sessionId?: string) => {
  if (!sessionId || sessionId === "new") {
    const newSession = await createChatSession(supabase, userId, "New Chat");
    return { sessionId: newSession.id, isNewSession: true };
  }
  return { sessionId, isNewSession: false };
};

export const saveUserMessage = async (
  supabase: any,
  userMessage: Message & { dbParts: MessagePart[] },
  sessionId: string,
  userId: string
): Promise<DBChatMessage> => {
  return await addMessage(supabase, {
    id: userMessage.id,
    session_id: sessionId,
    user_id: userId,
    role: "user",
    parts: userMessage.dbParts,
    model_used: null,
    model_provider: null,
    model_config: null,
    metadata: {},
  });
};

export const saveAssistantMessage = async (
  supabase: any,
  messageId: string,
  sessionId: string,
  userId: string,
  parts: MessagePart[],
  model: string,
  modelProvider: string,
  modelConfig: any,
  metadata: any = {}
): Promise<void> => {
  await addMessage(supabase, {
    id: messageId,
    session_id: sessionId,
    user_id: userId,
    role: "assistant",
    parts,
    model_used: model,
    model_provider: modelProvider,
    model_config: modelConfig,
    metadata,
  });
};

export const generateChatTitle = async (userMessage: string): Promise<string> => {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content:
            "Generate a concise title (max 50 chars) for this chat. No quotes or formatting.",
        },
        { role: "user", content: userMessage },
      ],
      maxTokens: 50,
      temperature: 0.7,
    });
    return text.trim().substring(0, 50);
  } catch (error) {
    console.error("Title generation failed:", error);
    return userMessage.substring(0, 50);
  }
};

export const updateSessionTitle = async (supabase: any, sessionId: string, messages: Message[]) => {
  const firstUserMessage = messages.find((m) => m.role === "user")?.content;
  if (typeof firstUserMessage === "string" && firstUserMessage.trim()) {
    const title = await generateChatTitle(firstUserMessage);
    await updateChatSessionTitle(supabase, sessionId, title);
  }
};

export { uuidv4 as generateId };
