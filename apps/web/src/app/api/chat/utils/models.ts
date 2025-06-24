import { PROVIDER_MAPPING, type ModelConfig, type ReasoningLevel } from "@/config/models";
import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type JSONValue, type LanguageModel } from "ai";

const PROVIDERS = { google, openai, anthropic, xai, deepseek, groq } as const;

export interface ModelMappingResult {
  supported: true;
  provider:
    | typeof google
    | typeof openai
    | typeof anthropic
    | typeof xai
    | typeof deepseek
    | typeof groq
    | ReturnType<typeof createOpenRouter>;
  model: string;
  providerInfo: {
    name: string;
    supported: boolean;
  };
}

export interface UnsupportedModelResult {
  supported: false;
  message: string;
}

export type ModelMapping = ModelMappingResult | UnsupportedModelResult;

export const getModelMapping = (config: ModelConfig, apiKey?: string): ModelMapping => {
  const providerInfo = PROVIDER_MAPPING[config.provider];

  if (!providerInfo.supported || !providerInfo.name || !config.apiModelName) {
    return {
      supported: false,
      message: `${config.name} (${config.provider}) not supported.`,
    };
  }

  // Handle OpenRouter
  if (providerInfo.name === "openrouter") {
    const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY;
    const openrouter = createOpenRouter({
      apiKey: openRouterKey,
    });

    return {
      supported: true,
      provider: openrouter,
      model: config.apiModelName,
      providerInfo,
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

  if (providerName && providerName !== "openrouter") {
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
        case "Anthropic":
          providerSettings.thinking = {
            type: "enabled",
            budgetTokens: { low: 1024, medium: 4096, high: 8192 }[reasoningLevel],
          };
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

  // Handle OpenRouter models
  if (mapping.providerInfo.name === "openrouter") {
    return (provider as ReturnType<typeof createOpenRouter>).chat(model);
  }

  // Handle Google with search grounding
  if (config.provider === "Google" && config.capabilities.includes("search") && searchEnabled) {
    return (provider as typeof google)(model, {
      useSearchGrounding: true,
      dynamicRetrievalConfig: { mode: "MODE_DYNAMIC" as const, dynamicThreshold: 0.3 },
    });
  }

  return (
    provider as
      | typeof google
      | typeof openai
      | typeof anthropic
      | typeof xai
      | typeof deepseek
      | typeof groq
  )(model);
};

export const buildSystemMessage = (
  config: ModelConfig,
  searchEnabled: boolean,
  memoryEnabled: boolean = true,
  userTraits?: string,
  assistantName?: string
): string => {
  const currentTime = new Date().toUTCString();
  const hasWebSearchTool = searchEnabled && !config.capabilities.includes("search");

  const baseInstructions = [
    `You are a helpful AI assistant. Current time: ${currentTime}.`,
    assistantName && `Your name is ${assistantName}.`,
    userTraits && `User preferences to follow: "${userTraits}"`,
  ];

  const capabilities = [
    hasWebSearchTool && "Use the 'webSearch' tool for current information.",
    config.capabilities.includes("search") && searchEnabled && "You have native web search.",
    memoryEnabled && "Use 'memorySave'/'memoryRetrieve' tools for user preferences.",
    config.capabilities.includes("image") && "You can analyze images.",
    config.capabilities.includes("pdf") && "You can read PDFs.",
  ].filter(Boolean);

  const formattingRules = [
    "Use markdown for code blocks (e.g., ```python).",
    "For math, use LaTeX (`$$...$$` or `$...$`). To show a dollar amount, escape the dollar sign: `\\$145.86`.",
  ];

  if (config.provider === "Anthropic") {
    formattingRules.push(
      "Wrap filenames with double underscores (e.g., `__init__.py`) in backticks. Use standard markdown lists (* or -)."
    );
  }

  return [...baseInstructions, ...capabilities, ...formattingRules].filter(Boolean).join(" ");
};
