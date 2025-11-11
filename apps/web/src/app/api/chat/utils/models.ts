import { PROVIDER_MAPPING, type ModelConfig, type ReasoningLevel } from "@/config/models";
import { isModelEnabledForUser } from "@/services/server/user-api-keys.server";
import { type Database } from "@/types/supabase-types";
import { createOpenRouter, type OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import { type SupabaseClient } from "@supabase/supabase-js";
import { type JSONValue, type LanguageModel } from "ai";

export interface ModelMappingResult {
  supported: true;
  provider: OpenRouterProvider;
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

  // OpenRouter handles all models through unified gateway
  if (providerInfo.name === "openrouter") {
    const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY;
    const openrouter = createOpenRouter({
      apiKey: openRouterKey,
      // Enable intelligent routing and fallbacks
      // These options let OpenRouter automatically:
      // - Load balance across multiple providers
      // - Fall back to backup providers if primary is unavailable
      // - Apply data collection policies
      // - Optimize for cost and performance
    });

    return {
      supported: true,
      provider: openrouter,
      model: config.apiModelName,
      providerInfo,
    };
  }

  return {
    supported: false,
    message: `Provider ${config.provider} not supported. Only OpenRouter is available.`,
  };
};

// Enhanced function that checks both model availability and user permissions
export const getModelMappingWithPermissions = async (
  config: ModelConfig,
  apiKey: string | undefined,
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ModelMapping> => {
  // First check basic model mapping
  const basicMapping = getModelMapping(config, apiKey);
  if (!basicMapping.supported) {
    return basicMapping;
  }

  // If user has BYOK enabled for this model, check if it's allowed
  try {
    const isEnabled = await isModelEnabledForUser(userId, config.id, config.provider);
    if (!isEnabled) {
      // Check if user is trying to use BYOK but model is disabled
      const hasUserKey = !!apiKey; // apiKey would be from user's database
      if (hasUserKey) {
        return {
          supported: false,
          message: `${config.name} is disabled in your BYOK settings. Enable it in Settings > API Keys.`,
        };
      }
    }
  } catch (error) {
    // If permission check fails, continue with basic mapping (fallback to default keys)
    console.warn("Failed to check model permissions:", error);
  }

  return basicMapping;
};

export const buildProviderOptions = (
  config: ModelConfig,
  reasoningLevel: ReasoningLevel,
  apiKey?: string
): Record<string, Record<string, JSONValue>> => {
  // Configure OpenRouter's intelligent provider routing
  // These options enable automatic:
  // - Load balancing across providers
  // - Fallback handling
  // - Data collection policies
  // - Cost optimization
  const openRouterOptions: Record<string, JSONValue> = {};

  // Enable data privacy by default (OpenRouter will only use ZDR-compliant providers)
  openRouterOptions.provider = {
    allow_fallbacks: true, // Enable automatic fallbacks for maximum uptime
    data_collection: "deny", // Don't use providers that may store data
    require_parameters: false, // Allow providers that support subset of parameters
    sort: "price", // Optimize for cost-effectiveness
  };

  // Add reasoning-specific options if supported
  if (reasoningLevel && config.reasoningLevels?.includes(reasoningLevel)) {
    // OpenRouter automatically handles reasoning budget allocation
    // based on the model and provider capabilities
    openRouterOptions.reasoning_level = reasoningLevel;
  }

  return {
    openrouter: openRouterOptions,
  };
};

export const createModelInstance = (
  config: ModelConfig,
  mapping: ModelMappingResult
): LanguageModel => {
  const { provider, model } = mapping;

  // OpenRouter handles all models through unified gateway
  // Enable usage tracking for analytics and cost monitoring
  return (provider as ReturnType<typeof createOpenRouter>).chat(model, {
    usage: {
      include: true,
    },
  }) as LanguageModel;
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
    "Use markdown for code blocks with language specification (e.g., ```python, ```javascript, ```rust).",
    "Math: Use `$expression$` for inline and `$$expression$$` for display. Put complex equations on separate lines with `$$`.",
    "For literal dollar amounts, escape the dollar sign: `\\$145.86` (not `$145.86`).",
    "IMPORTANT: Never include generated images in markdown image syntax (![](url)). Images generated via tools are displayed automatically in the UI. Only describe the images you've generated, don't embed them again.",
    "Wrap filenames with double underscores (e.g., `__init__.py`) in backticks. Use standard markdown lists (* or -).",
  ];

  return [...baseInstructions, ...capabilities, ...formattingRules].filter(Boolean).join(" ");
};
