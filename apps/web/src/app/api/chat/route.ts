import { getModelById, type ReasoningLevel } from "@/config/models";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { streamText, type Message } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Helper function to detect potential code patterns and suggest language hints
function enhanceSystemMessageWithCodeGuidance(): string {
  return `You are a helpful AI assistant. Format responses clearly:

- Use ## headers to organize sections
- Use numbered lists for steps: 1. 2. 3.
- Use bullet points for items: - item
- Use **bold** for important terms
- Use \`code\` for technical terms
- Always specify language: \`\`\`python \`\`\`javascript etc.
- Keep it clean and scannable`;
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      model = "gemini-2.5-flash",
      reasoningLevel = "medium",
      searchEnabled = false,
    }: {
      messages: Message[];
      model?: string;
      reasoningLevel?: ReasoningLevel;
      searchEnabled?: boolean;
    } = await req.json();

    // Get model configuration
    const modelConfig = getModelById(model);

    if (!modelConfig) {
      return new Response(
        JSON.stringify({
          error: "Invalid model selection",
          details: `Model ${model} not found`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Model mappings for different providers
    const modelMappings = {
      // Google/Gemini models
      "gemini-2.0-flash": { provider: google, model: "gemini-2.0-flash-exp" },
      "gemini-2.5-flash": { provider: google, model: "gemini-1.5-flash" },
      "gemini-2.5-flash-thinking": { provider: google, model: "gemini-1.5-flash" },
      "gemini-2.5-pro": { provider: google, model: "gemini-1.5-pro" },

      // OpenAI models
      "gpt-4o": { provider: openai, model: "gpt-4o" },
      "gpt-4o-mini": { provider: openai, model: "gpt-4o-mini" },
      "gpt-4.5": { provider: openai, model: "gpt-4o" }, // Fallback until available
      "o3-mini": { provider: openai, model: "gpt-4o-mini" }, // Fallback until available
      "o4-mini": { provider: openai, model: "gpt-4o-mini" }, // Fallback until available

      // Anthropic models
      "claude-3.5-sonnet": { provider: anthropic, model: "claude-3-5-sonnet-20241022" },
      "claude-3.7-sonnet": { provider: anthropic, model: "claude-3-5-sonnet-20241022" }, // Using latest available
      "claude-4-sonnet": { provider: anthropic, model: "claude-3-5-sonnet-20241022" }, // Fallback until available
      "claude-4-opus": { provider: anthropic, model: "claude-3-opus-20240229" }, // Using Claude 3 Opus for now

      // For models not yet supported by AI SDK, we'll return an error with helpful message
      "llama-3.3-70b": null,
      "llama-4-scout": null,
      "llama-4-maverick": null,
      "deepseek-v3-base": null,
      "deepseek-v3-chat": null,
      "deepseek-r1-preview": null,
      "deepseek-r1-zero": null,
      "grok-3": null,
      "grok-3-mini": null,
      "qwq-32b": null,
      "qwen-2.5-32b": null,
    };

    const modelMapping = modelMappings[model as keyof typeof modelMappings];

    if (modelMapping === null) {
      return new Response(
        JSON.stringify({
          error: "Model not yet supported",
          details: `${modelConfig.name} (${modelConfig.provider}) support is coming soon. Currently supported: OpenAI, Google Gemini, and Anthropic Claude models.`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!modelMapping) {
      return new Response(
        JSON.stringify({
          error: "Model mapping not found",
          details: `No mapping configured for model ${model}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Prepare system message based on capabilities
    let systemMessage = "";

    if (modelConfig.capabilities.includes("reasoning") && reasoningLevel) {
      systemMessage += `You are an AI assistant with ${reasoningLevel} level reasoning capabilities. `;
      if (reasoningLevel === "high") {
        systemMessage +=
          "Take time to think through problems step by step and show your reasoning process. ";
      } else if (reasoningLevel === "medium") {
        systemMessage += "Provide thoughtful analysis with clear reasoning. ";
      } else if (reasoningLevel === "low") {
        systemMessage += "Provide quick but accurate responses. ";
      }
    }

    if (modelConfig.capabilities.includes("search") && searchEnabled) {
      systemMessage += "You have access to web search capabilities when needed. ";
    }

    if (modelConfig.capabilities.includes("image")) {
      systemMessage += "You can analyze and understand images provided by users. ";
    }

    if (modelConfig.capabilities.includes("pdf")) {
      systemMessage += "You can read and analyze PDF documents. ";
    }

    // Always add code formatting guidance for better syntax highlighting
    systemMessage += "\n\n" + enhanceSystemMessageWithCodeGuidance();

    const finalMessages: Message[] = systemMessage
      ? [
          { role: "system", content: systemMessage, id: `system-${Date.now()}` } as Message,
          ...messages,
        ]
      : messages;

    // Configure model-specific parameters
    let temperature = 0.7;
    let maxTokens = modelConfig.maxTokens || 4000;

    // Adjust parameters based on model capabilities
    if (modelConfig.capabilities.includes("reasoning")) {
      if (reasoningLevel === "high") {
        temperature = 0.3; // Lower temperature for more focused reasoning
        maxTokens = Math.min(maxTokens, 8000); // Allow more tokens for detailed reasoning
      } else if (reasoningLevel === "low") {
        temperature = 0.9; // Higher temperature for faster responses
      }
    }

    const result = streamText({
      model: modelMapping.provider(modelMapping.model),
      messages: finalMessages,
      maxTokens,
      temperature,
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
