import { createClient } from "@/utils/supabase/server";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const SuggestedQuestionsSchema = z.object({
  questions: z
    .array(z.string())
    .describe("Array of 3-4 thoughtful follow-up questions that a user might want to ask"),
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
      prompt: `Generate 3-4 thoughtful follow-up questions a user might ask to continue this conversation with an AI assistant. The questions should be relevant to the topic discussed, engaging, and appropriate for asking an AI (avoid questions about personal experiences, feelings, or human-specific situations). Focus on clarification, deeper exploration of concepts, practical applications, or related topics.

User: ${userMessage}
Assistant: ${assistantMessage}

Questions:`,
    });

    return Response.json({ questions: result.object.questions });
  } catch {
    return Response.json({ error: "An error occurred" }, { status: 500 });
  }
}
