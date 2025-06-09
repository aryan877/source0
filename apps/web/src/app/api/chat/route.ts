import { openai } from "@ai-sdk/openai";
import { streamText, type Message } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, model = "gpt-4o" }: { messages: Message[]; model?: string } =
      await req.json();

    // Validate model selection
    const allowedModels = ["gpt-4o", "gpt-4o-mini"];
    const selectedModel = allowedModels.includes(model) ? model : "gpt-4o";

    const result = streamText({
      model: openai(selectedModel),
      messages,
      maxTokens: 4000,
      temperature: 0.7,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);

    // Return more detailed error information in development
    if (process.env.NODE_ENV === "development") {
      return new Response(
        JSON.stringify({
          error: "Chat API Error",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}
