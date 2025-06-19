import { createClient } from "@/utils/supabase/server";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const SuggestedQuestionsSchema = z.object({
  questions: z
    .array(z.string())
    .describe("Array of 3-4 thoughtful follow-up questions based on the conversation context"),
});

interface SuggestRequest {
  userMessage: string;
  assistantMessage: string;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "User not authenticated" }, { status: 401 });
    }

    const body: SuggestRequest = await req.json();
    const { userMessage, assistantMessage } = body;

    if (!userMessage || !assistantMessage) {
      return Response.json(
        { error: "Both userMessage and assistantMessage are required" },
        { status: 400 }
      );
    }

    // Generate suggested questions using GPT-4o Mini
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: SuggestedQuestionsSchema,
      prompt: `Based on this conversation exchange, generate 3-4 thoughtful follow-up questions that would naturally continue the discussion. The questions should be:
- Relevant to the topic discussed
- Encourage deeper exploration
- Be conversational and engaging
- Avoid yes/no questions

User message: ${userMessage}

Assistant response: ${assistantMessage}

Generate questions that build upon this exchange:`,
    });

    return Response.json({ questions: result.object.questions });
  } catch {
    return Response.json({ error: "An error occurred" }, { status: 500 });
  }
}
