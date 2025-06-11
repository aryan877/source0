import { getModelById, MODELS, type ModelConfig, type ReasoningLevel } from "@/config/models";
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

// Dynamic model mapping based on provider and model configuration
function getModelMapping(modelConfig: ModelConfig) {
  // Check if model has apiModelName (source of truth)
  if (!modelConfig.apiModelName) {
    return {
      provider: null,
      model: null,
      supported: false,
      message: `API model name not configured for ${modelConfig.name}`,
    };
  }

  switch (modelConfig.provider) {
    case "Google":
      return {
        provider: google,
        model: modelConfig.apiModelName,
        supported: true,
      };

    case "OpenAI":
      return {
        provider: openai,
        model: modelConfig.apiModelName,
        supported: true,
      };

    case "Anthropic":
      return {
        provider: anthropic,
        model: modelConfig.apiModelName,
        supported: true,
      };

    case "Meta":
    case "DeepSeek":
    case "xAI":
    case "Qwen":
      // These providers are not yet supported by AI SDK
      return {
        provider: null,
        model: null,
        supported: false,
        message: `${modelConfig.name} (${modelConfig.provider}) support is coming soon. Currently supported: OpenAI, Google Gemini, and Anthropic Claude models.`,
      };

    default:
      return {
        provider: null,
        model: null,
        supported: false,
        message: `Provider ${modelConfig.provider} is not yet supported.`,
      };
  }
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
          details: `Model ${model} not found. Available models: ${MODELS.map((m) => m.id).join(", ")}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get dynamic model mapping
    const modelMapping = getModelMapping(modelConfig);

    if (!modelMapping.supported) {
      return new Response(
        JSON.stringify({
          error: "Model not yet supported",
          details: modelMapping.message,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Prepare system message based on capabilities
    let systemMessage = "";

    // Check if provider supports reasoning effort at API level
    const supportsReasoningEffortAPI =
      modelConfig.provider === "OpenAI" && modelConfig.capabilities.includes("reasoning");

    if (
      modelConfig.capabilities.includes("reasoning") &&
      reasoningLevel &&
      !supportsReasoningEffortAPI
    ) {
      // Use system message approach for providers without native reasoning effort API
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

    // Prepare streamText parameters
    const baseParams = {
      model: modelMapping.provider!(modelMapping.model!),
      messages: finalMessages,
    };

    // Add reasoning effort for supported providers (OpenAI)
    const streamParams =
      supportsReasoningEffortAPI && reasoningLevel
        ? { ...baseParams, reasoningEffort: reasoningLevel }
        : baseParams;

    const result = streamText(streamParams);

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
