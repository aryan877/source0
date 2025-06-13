import {
  getModelById,
  PROVIDER_MAPPING,
  type ModelConfig,
  type ReasoningLevel,
} from "@/config/models";
import { type GoogleProviderMetadata, type ProviderMetadata } from "@/types/google-metadata";

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import {
  createDataStreamResponse,
  experimental_generateImage as generateImage,
  streamText,
  type JSONValue,
  type LanguageModel,
  type Message,
} from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Type definitions
interface ErrorResponse {
  error: string;
  code?: string;
}

interface ImageGenerationResponse {
  role: "assistant";
  content: string;
  parts: Array<{
    type: "text" | "file";
    text?: string;
    mimeType?: string;
    data?: string;
  }>;
}

interface ChatRequest {
  messages: Message[];
  model?: string;
  reasoningLevel?: ReasoningLevel;
  searchEnabled?: boolean;
}

interface ModelMappingResult {
  supported: true;
  provider: typeof google | typeof openai | typeof anthropic | typeof xai;
  model: string;
  providerInfo: {
    name: string;
    hasSearchGrounding?: boolean;
    hasReasoning?: boolean;
    supported: boolean;
  };
}

interface UnsupportedModelResult {
  supported: false;
  message: string;
}

type ModelMapping = ModelMappingResult | UnsupportedModelResult;

// Centralized error handling
const createErrorResponse = (message: string, status: number = 500, code?: string): Response =>
  new Response(JSON.stringify({ error: message, ...(code && { code }) } satisfies ErrorResponse), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const logError = (error: Error, context: string, data: Record<string, unknown> = {}): void => {
  console.error(`🚨 [${context}]`, {
    error: { message: error.message, name: error.name },
    ...data,
  });
};

// AI SDK provider instances
const PROVIDERS = {
  google,
  openai,
  anthropic,
  xai,
} as const;

// Dynamic model mapping using centralized config
const getModelMapping = (config: ModelConfig): ModelMapping => {
  const providerInfo = PROVIDER_MAPPING[config.provider];

  if (!providerInfo.supported || !providerInfo.name) {
    return {
      supported: false,
      message: `${config.name} (${config.provider}) support is coming soon. Currently supported: OpenAI, Google Gemini, Anthropic Claude, and xAI Grok models.`,
    };
  }

  if (!config.apiModelName) {
    return {
      supported: false,
      message: `API model name not configured for ${config.name}`,
    };
  }

  return {
    supported: true,
    provider: PROVIDERS[providerInfo.name as keyof typeof PROVIDERS],
    model: config.apiModelName,
    providerInfo,
  };
};

// Image generation handler
const handleImageGeneration = async (
  prompt: string,
  config: ModelConfig
): Promise<ImageGenerationResponse> => {
  if (!config.capabilities.includes("image-generation") || config.provider !== "OpenAI") {
    throw new Error("Only OpenAI models support image generation currently");
  }

  const { image } = await generateImage({
    model: openai.image(config.apiModelName!),
    prompt,
    size: "1024x1024",
  });

  return {
    role: "assistant",
    content: "I've generated an image based on your request.",
    parts: [
      { type: "text", text: "I've generated an image based on your request." },
      { type: "file", mimeType: "image/png", data: image.base64 },
    ],
  };
};

// Provider-specific options builder
const buildProviderOptions = (
  config: ModelConfig,
  reasoningLevel: ReasoningLevel
): Record<string, Record<string, JSONValue>> => {
  const options: Record<string, Record<string, JSONValue>> = {};

  if (reasoningLevel && config.reasoningLevels?.includes(reasoningLevel)) {
    switch (config.provider) {
      case "Google":
        options.google = {
          thinkingConfig: {
            thinkingBudget: { low: 1024, medium: 4096, high: 8192 }[reasoningLevel],
            includeThoughts: true,
          },
        };
        break;
      case "OpenAI":
        options.openai = { reasoningEffort: reasoningLevel };
        break;
      case "xAI":
        options.xai = { reasoningEffort: reasoningLevel };
        break;
    }
  }

  return options;
};

// Model instance factory
const createModelInstance = (
  config: ModelConfig,
  mapping: ModelMappingResult,
  searchEnabled: boolean
): LanguageModel => {
  const { provider, model } = mapping;

  // Google with search grounding
  if (config.provider === "Google" && config.capabilities.includes("search") && searchEnabled) {
    console.log("🔍 Creating Google model with search grounding enabled", { model, searchEnabled });
    return provider(model, {
      useSearchGrounding: true,
      dynamicRetrievalConfig: { mode: "MODE_DYNAMIC" as const, dynamicThreshold: 0.3 },
    });
  }

  // All other models use standard provider call
  return provider(model);
};

const logGoogleMetadata = (
  providerMetadata: ProviderMetadata | undefined,
  model: string
): GoogleProviderMetadata["groundingMetadata"] | null => {
  const grounding = providerMetadata?.google?.groundingMetadata;

  if (grounding) {
    console.log("🔍 Grounding metadata:", {
      model,
      queries: grounding.webSearchQueries?.length ?? 0,
      chunks: grounding.groundingChunks?.length ?? 0,
      supports: grounding.groundingSupports?.length ?? 0,
    });

    // Log search queries concisely
    if (grounding.webSearchQueries?.length) {
      console.log("🔍 Search queries:", grounding.webSearchQueries);
    }

    // Log source domains only (not full URLs)
    if (grounding.groundingChunks?.length) {
      const sources = grounding.groundingChunks
        .map((chunk) => chunk.web?.title || "Unknown")
        .filter((title, index, arr) => arr.indexOf(title) === index);
      console.log("🔍 Sources:", sources.join(", "));
    }

    // Log grounding coverage summary
    if (grounding.groundingSupports?.length) {
      const totalTextLength = grounding.groundingSupports.reduce(
        (sum, support) => sum + (support.segment?.text?.length || 0),
        0
      );
      console.log("🔍 Grounding coverage:", {
        segments: grounding.groundingSupports.length,
        avgConfidence: (
          grounding.groundingSupports
            .flatMap((s) => s.confidenceScores || [])
            .reduce((sum, score) => sum + score, 0) /
          grounding.groundingSupports.flatMap((s) => s.confidenceScores || []).length
        ).toFixed(2),
        totalChars: totalTextLength,
      });
    }
  }

  return grounding;
};

export async function POST(req: Request): Promise<Response> {
  try {
    const {
      messages,
      model = "gemini-2.5-flash",
      reasoningLevel = "medium",
      searchEnabled = false,
    }: ChatRequest = await req.json();

    console.log(`🚀 Starting chat request`, { model, reasoningLevel, searchEnabled });

    const modelConfig = getModelById(model);
    if (!modelConfig) {
      return createErrorResponse(`Model ${model} not found`, 400);
    }

    // Handle image generation
    const lastMessage = messages[messages.length - 1];
    if (
      modelConfig.capabilities.includes("image-generation") &&
      lastMessage?.role === "user" &&
      lastMessage.content
    ) {
      try {
        const result = await handleImageGeneration(lastMessage.content as string, modelConfig);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), "Image Generation", {
          model,
        });
        return createErrorResponse("Image generation failed", 500);
      }
    }

    // Get model mapping
    const mapping = getModelMapping(modelConfig);
    if (!mapping.supported) {
      return createErrorResponse(mapping.message, 400);
    }

    // Build system message
    const systemParts: (string | false)[] = [
      "You are a helpful AI assistant. Respond naturally and clearly.",
      modelConfig.capabilities.includes("search") &&
        searchEnabled &&
        "You have access to web search capabilities. Use search to find current information and cite sources.",
      modelConfig.capabilities.includes("image") &&
        "You can analyze and understand images provided by users.",
      modelConfig.capabilities.includes("pdf") && "You can read and analyze PDF documents.",
      "When providing code snippets, always enclose them in markdown code blocks and specify the programming language. For example, ` ```python ... ``` `. If the user requests a niche or fictional language (like 'bhailang'), use that exact name as the language specifier. This is critical for the UI to display the language name correctly.",
    ];

    const finalMessages: Message[] = [
      {
        role: "system",
        content: systemParts.filter(Boolean).join(" "),
        id: `system-${Date.now()}`,
      },
      ...messages,
    ];

    // Create model instance and provider options
    const modelInstance = createModelInstance(modelConfig, mapping, searchEnabled);
    const providerOptions = buildProviderOptions(modelConfig, reasoningLevel);

    // Use createDataStreamResponse to properly stream data and annotations
    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: modelInstance,
          messages: finalMessages,
          ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
          onError: ({ error }) =>
            logError(error instanceof Error ? error : new Error(String(error)), "Stream Error", {
              model,
            }),
          onFinish: ({ text, finishReason, reasoning, providerMetadata }) => {
            console.log(`✅ Stream completed`, {
              model,
              textLength: text?.length || 0,
              finishReason,
              hasReasoning: !!reasoning,
              hasProviderMetadata: !!providerMetadata,
            });

            // Send grounding metadata annotation only on finish
            if (providerMetadata?.google?.groundingMetadata) {
              const groundingMetadata = logGoogleMetadata(providerMetadata, model);
              if (groundingMetadata) {
                console.log("🔍 Sending final grounding annotation to client", {
                  type: "grounding",
                  hasWebSearchQueries: !!groundingMetadata.webSearchQueries?.length,
                  hasGroundingChunks: !!groundingMetadata.groundingChunks?.length,
                  hasGroundingSupports: !!groundingMetadata.groundingSupports?.length,
                });

                try {
                  dataStream.writeMessageAnnotation({
                    type: "grounding",
                    data: groundingMetadata as JSONValue,
                  });
                  console.log("✅ Final grounding annotation sent successfully");
                } catch (error) {
                  console.error("❌ Failed to send final grounding annotation:", error);
                }
              }
            }

            // Log full provider metadata for debugging
            if (process.env.NODE_ENV === "development" && providerMetadata) {
              console.log("🔍 Full providerMetadata:", JSON.stringify(providerMetadata, null, 2));
            }
          },
        });

        // Merge the streamText result into the data stream with automatic options
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: modelConfig.capabilities.includes("reasoning"),
          sendSources: modelConfig.capabilities.includes("search") || searchEnabled,
        });
      },
      onError: (error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        logError(err, "Response Error", { model });

        if (err.name === "AI_APICallError")
          return "Unable to connect to AI service. Please try again.";
        if (err.name === "AI_RetryError")
          return "Service temporarily unavailable. Please try again in a moment.";
        if (err.message.includes("rate limit") || err.message.includes("429")) {
          return "Too many requests. Please wait a moment before trying again.";
        }
        if (err.message.includes("401") || err.message.includes("unauthorized")) {
          return "Authentication error. Please try again.";
        }

        return "An error occurred. Please try again.";
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(err, "API Error", { url: req.url });

    if (err.message.includes("JSON"))
      return createErrorResponse("Invalid request format", 400, "INVALID_JSON");
    if (err.message.includes("401") || err.message.includes("unauthorized")) {
      return createErrorResponse("Authentication error", 401, "AUTH_ERROR");
    }

    return createErrorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
