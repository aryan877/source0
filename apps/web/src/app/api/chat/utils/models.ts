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
  isImageGenRequest: boolean = false
): string => {
  const parts = [
    "You are a helpful AI assistant. Respond naturally and clearly.",
    config.capabilities.includes("search") &&
      searchEnabled &&
      "You have access to web search. Use it for current info and cite sources.",
    config.capabilities.includes("image") && "You can analyze images.",
    config.capabilities.includes("pdf") && "You can read PDFs.",
    config.capabilities.includes("image-generation") &&
      isImageGenRequest &&
      "The user wants to generate images. Respond with: I'll generate that image for you. [GENERATE_IMAGE: detailed prompt]",
    "Use markdown code blocks with language specifiers: ```python code ```",
  ];

  return parts.filter(Boolean).join(" ");
};

export { getModelById };
