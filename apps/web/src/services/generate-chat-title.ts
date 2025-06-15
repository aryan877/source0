import { openai } from "@ai-sdk/openai";
import { generateText, type Message } from "ai";
import { updateTitle } from "./chat-sessions";

/**
 * Generate and update chat title based on the first user message
 */
export async function generateChatTitle(sessionId: string, messages: Message[]): Promise<void> {
  const firstUserMessage = messages.find((m) => m.role === "user")?.content;
  if (typeof firstUserMessage === "string" && firstUserMessage.trim()) {
    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        messages: [
          {
            role: "system",
            content:
              "Generate a concise title (max 50 chars) for this chat. No quotes or formatting.",
          },
          { role: "user", content: firstUserMessage },
        ],
        maxTokens: 50,
        temperature: 0.7,
      });
      const title = text.trim().substring(0, 50);
      await updateTitle(sessionId, title);
    } catch (error) {
      console.error("Title generation failed:", error);
      const fallbackTitle = firstUserMessage.substring(0, 50);
      await updateTitle(sessionId, fallbackTitle);
    }
  }
}

/**
 * Generate a title without updating the session
 */
export async function generateTitleOnly(firstUserMessage: string): Promise<string> {
  if (!firstUserMessage.trim()) {
    return "New Chat";
  }

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content:
            "Generate a concise title (max 50 chars) for this chat. No quotes or formatting.",
        },
        { role: "user", content: firstUserMessage },
      ],
      maxTokens: 50,
      temperature: 0.7,
    });
    return text.trim().substring(0, 50);
  } catch (error) {
    console.error("Title generation failed:", error);
    return firstUserMessage.substring(0, 50);
  }
}

/**
 * Generate title from message content
 */
export async function generateTitleFromContent(content: string): Promise<string> {
  return generateTitleOnly(content);
}
