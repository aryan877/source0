import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

/**
 * Generate a title without updating the session
 */
export async function generateTitleOnly(firstUserMessage: string): Promise<string> {
  if (!firstUserMessage.trim()) {
    return "New Chat";
  }

  try {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    const { text } = await generateText({
      model: openrouter("openai/gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content:
            "Generate a concise title (max 50 chars) for this chat. No quotes or formatting.",
        },
        { role: "user", content: firstUserMessage },
      ],
      maxOutputTokens: 50,
      temperature: 0.7,
    });
    return text.trim().substring(0, 50);
  } catch (error) {
    console.error("Title generation failed:", error);
    return firstUserMessage.substring(0, 50);
  }
}

