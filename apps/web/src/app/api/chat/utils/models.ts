import {
  getModelById,
  PROVIDER_MAPPING,
  type ModelConfig,
  type ReasoningLevel,
} from "@/config/models";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { type JSONValue, type LanguageModel } from "ai";

const PROVIDERS = { google, openai, anthropic, xai } as const;

export interface ModelMappingResult {
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

export interface UnsupportedModelResult {
  supported: false;
  message: string;
}

export type ModelMapping = ModelMappingResult | UnsupportedModelResult;

export const getModelMapping = (config: ModelConfig): ModelMapping => {
  const providerInfo = PROVIDER_MAPPING[config.provider];

  if (!providerInfo.supported || !providerInfo.name || !config.apiModelName) {
    return {
      supported: false,
      message: `${config.name} (${config.provider}) not supported. Available: OpenAI, Google, Anthropic, xAI.`,
    };
  }

  return {
    supported: true,
    provider: PROVIDERS[providerInfo.name as keyof typeof PROVIDERS],
    model: config.apiModelName,
    providerInfo,
  };
};

export const buildProviderOptions = (
  config: ModelConfig,
  reasoningLevel: ReasoningLevel,
  apiKey?: string
): Record<string, Record<string, JSONValue>> => {
  const options: Record<string, Record<string, JSONValue>> = {};
  const providerName = PROVIDER_MAPPING[config.provider].name;

  if (providerName) {
    const providerSettings: Record<string, JSONValue> = {};

    if (apiKey) {
      providerSettings.apiKey = apiKey;
    }

    if (reasoningLevel && config.reasoningLevels?.includes(reasoningLevel)) {
      switch (config.provider) {
        case "Google":
          providerSettings.thinkingConfig = {
            thinkingBudget: { low: 1024, medium: 4096, high: 8192 }[reasoningLevel],
            includeThoughts: true,
          };
          break;
        case "OpenAI":
        case "xAI":
          providerSettings.reasoningEffort = reasoningLevel;
          break;
      }
    }

    if (Object.keys(providerSettings).length > 0) {
      options[providerName] = providerSettings;
    }
  }

  return options;
};

export const createModelInstance = (
  config: ModelConfig,
  mapping: ModelMappingResult,
  searchEnabled: boolean
): LanguageModel => {
  const { provider, model } = mapping;

  if (config.provider === "Google" && config.capabilities.includes("search") && searchEnabled) {
    return provider(model, {
      useSearchGrounding: true,
      dynamicRetrievalConfig: { mode: "MODE_DYNAMIC" as const, dynamicThreshold: 0.3 },
    });
  }

  return provider(model);
};

export const buildSystemMessage = (
  config: ModelConfig,
  searchEnabled: boolean,
  memoryEnabled: boolean = true,
  userTraits?: string,
  assistantName?: string
): string => {
  const currentTime = new Date().toLocaleString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  // Only mention webSearch tool if the model doesn't have native search grounding
  const hasWebSearchTool = searchEnabled && !config.capabilities.includes("search");

  const parts = [
    `You are a helpful AI assistant. The current time is ${currentTime}. Respond naturally and clearly.`,
    assistantName &&
      `The assistant's name is ${assistantName}. Address yourself by name when appropriate.`,
    userTraits && `Here are the traits user wants you to follow: "${userTraits}"`,
    hasWebSearchTool &&
      "You have access to a web search tool. Use it when you need current information, recent news, or facts not in your training data. Call the webSearch tool with relevant queries.",
    config.capabilities.includes("search") &&
      searchEnabled &&
      "You have native web search capabilities integrated into your responses. You can automatically search for and include current information when needed.",
    memoryEnabled &&
      "You have access to memory tools that allow you to save and retrieve important user information for personalized interactions. Use memorySave when users share personal preferences, information, or important details worth remembering. Use memoryRetrieve when you need context about the user to provide personalized responses. Always show when you're saving or retrieving memories.",
    config.capabilities.includes("image") && "You can analyze images.",
    config.capabilities.includes("pdf") && "You can read PDFs.",
    "When providing code examples, use markdown code blocks with appropriate language specifiers: ```python code ```",
  ];

  return parts.filter(Boolean).join(" ");
};

export { getModelById };
