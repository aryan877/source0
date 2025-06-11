import { getModelById, MODELS, type ModelConfig, type ReasoningLevel } from "@/config/models";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import {
  experimental_generateImage as generateImage,
  streamText,
  type JSONValue,
  type Message,
} from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Simplified server-side error logger
const logServerError = (error: Error, context: string, data: Record<string, unknown> = {}) => {
  const isDevelopment = process.env.NODE_ENV === "development";
  console.error(`🚨 [API Error - ${context}]`, {
    error: {
      message: error.message,
      name: error.name,
      stack: isDevelopment ? error.stack : undefined,
    },
    ...data,
  });
  // In production, integrate with a logging service (e.g., Sentry, DataDog)
};

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

    case "xAI":
      return {
        provider: xai,
        model: modelConfig.apiModelName,
        supported: true,
      };

    case "Meta":
    case "DeepSeek":
    case "Qwen":
      // These providers are not yet supported by AI SDK
      return {
        provider: null,
        model: null,
        supported: false,
        message: `${modelConfig.name} (${modelConfig.provider}) support is coming soon. Currently supported: OpenAI, Google Gemini, Anthropic Claude, and xAI Grok models.`,
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

// Helper to handle image generation requests using AI SDK
async function handleImageGeneration(prompt: string, modelConfig: ModelConfig): Promise<string> {
  if (!modelConfig.capabilities.includes("image-generation")) {
    throw new Error("Model does not support image generation");
  }

  if (modelConfig.provider !== "OpenAI") {
    throw new Error("Only OpenAI models support image generation currently");
  }

  try {
    const { image } = await generateImage({
      model: openai.image(modelConfig.apiModelName!),
      prompt: prompt,
      size: "1024x1024", // Supported size for gpt-image-1
    });

    return image.base64;
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
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

    const requestContext = {
      model,
      reasoningLevel,
      searchEnabled,
      messageCount: Array.isArray(messages) ? messages.length : 0,
    };

    console.log(`🚀 Starting chat request`, requestContext);

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

    // Check if this is an image generation model
    const isImageGenerationModel = modelConfig.capabilities.includes("image-generation");
    const lastMessage = messages[messages.length - 1];

    if (isImageGenerationModel && lastMessage?.role === "user" && lastMessage.content) {
      try {
        const imageBase64 = await handleImageGeneration(lastMessage.content, modelConfig);

        // Return the generated image as a file part in the AI SDK format
        return new Response(
          JSON.stringify({
            role: "assistant",
            content: "I've generated an image based on your request.",
            parts: [
              {
                type: "text",
                text: "I've generated an image based on your request.",
              },
              {
                type: "file",
                mimeType: "image/png",
                data: imageBase64,
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        const serverError = error instanceof Error ? error : new Error(String(error));
        logServerError(serverError, "Image Generation Error", requestContext);
        return new Response(
          JSON.stringify({
            error: "Image generation failed",
            details: serverError.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Get dynamic model mapping for regular chat
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

    // Conditionally create model instance with search grounding for Google models
    const modelInstance =
      modelConfig.provider === "Google" &&
      modelConfig.capabilities.includes("search") &&
      searchEnabled
        ? google(modelMapping.model!, { useSearchGrounding: true })
        : modelMapping.provider!(modelMapping.model!);

    // Add provider-specific options based on model configuration
    const providerOptions: Record<string, Record<string, JSONValue>> = {};

    if (
      reasoningLevel &&
      modelConfig.reasoningLevels &&
      modelConfig.reasoningLevels.includes(reasoningLevel)
    ) {
      switch (modelConfig.provider) {
        case "Google": {
          const thinkingBudgetMap: Record<ReasoningLevel, number> = {
            low: 1024,
            medium: 4096,
            high: 8192,
          };
          providerOptions.google = {
            thinkingConfig: {
              thinkingBudget: thinkingBudgetMap[reasoningLevel],
              includeThoughts: true,
            },
          };
          break;
        }
        case "OpenAI":
          providerOptions.openai = { reasoningEffort: reasoningLevel };
          break;
        case "xAI":
          providerOptions.xai = { reasoningEffort: reasoningLevel };
          break;
        // Add other providers here as they support reasoning parameters
      }
    }

    const result = streamText({
      model: modelInstance,
      messages: finalMessages,
      ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
      // Enhanced error handling with logging
      onError: ({ error }) => {
        const serverError = error instanceof Error ? error : new Error(String(error));
        logServerError(serverError, "streamText Error", {
          ...requestContext,
          filteredMessagesCount: finalMessages.length,
          lastMessageRole: finalMessages[finalMessages.length - 1]?.role,
          lastMessageLength: finalMessages[finalMessages.length - 1]?.content?.length,
        });
      },
      // Log successful finish
      onFinish: ({ text, usage, finishReason }) => {
        console.log(`✅ Stream completed successfully`, {
          model,
          textLength: text?.length || 0,
          usage,
          finishReason,
          timestamp: new Date().toISOString(),
        });

        // Log potential issues
        if (finishReason === "length") {
          console.warn(`⚠️ Response truncated due to length limit`, {
            model,
            textLength: text?.length,
            usage,
          });
        }
      },
    });

    return result.toDataStreamResponse({
      sendReasoning: true,
      getErrorMessage: (error) => {
        const serverError = error instanceof Error ? error : new Error(String(error));
        logServerError(serverError, "Data Stream Response Error", requestContext);

        // Return user-friendly error messages with error name
        const prefix = serverError.name !== "Error" ? `[${serverError.name}] ` : "";
        let message = "An error occurred. Please try again.";

        if (serverError.name === "AI_APICallError") {
          message = "Unable to connect to AI service. Please try again.";
        } else if (serverError.name === "AI_RetryError") {
          message = "Service temporarily unavailable. Please try again in a moment.";
        } else if (
          serverError.message.includes("rate limit") ||
          serverError.message.includes("429")
        ) {
          message = "Too many requests. Please wait a moment before trying again.";
        } else if (
          serverError.message.includes("401") ||
          serverError.message.includes("unauthorized")
        ) {
          message = "Authentication error. Please try again.";
        }

        return `${prefix}${message}`;
      },
    });
  } catch (error) {
    const serverError = error instanceof Error ? error : new Error("Unknown server error");

    logServerError(serverError, "Top-level API Error", {
      headers: Object.fromEntries(req.headers.entries()),
      url: req.url,
    });

    // Return appropriate error response
    if (serverError.message.includes("JSON")) {
      return new Response(
        JSON.stringify({
          error: "Invalid request format. Please try again.",
          code: "INVALID_JSON",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (serverError.message.includes("401") || serverError.message.includes("unauthorized")) {
      return new Response(
        JSON.stringify({
          error: "Authentication error. Please refresh and try again.",
          code: "AUTH_ERROR",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generic server error
    return new Response(
      JSON.stringify({
        error: "Internal server error. Please try again later.",
        code: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
