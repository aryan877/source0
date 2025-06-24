export type ModelCapability = "image" | "pdf" | "search" | "reasoning" | "image-generation";

export type ReasoningLevel = "low" | "medium" | "high";

// Capability labels - single source of truth
export const CAPABILITY_LABELS = {
  image: "Vision",
  pdf: "PDFs",
  search: "Search",
  reasoning: "Reasoning",
  "image-generation": "Image Gen",
} as const;

// Provider mapping for AI SDK
export const PROVIDER_MAPPING = {
  Google: { name: "google", supported: true },
  OpenAI: { name: "openai", supported: true },
  Anthropic: { name: "anthropic", supported: true },
  xAI: { name: "xai", supported: true },
  Groq: { name: "groq", supported: true },
  DeepSeek: { name: "deepseek", supported: true },
  OpenRouter: { name: "openrouter", supported: true },
} as const;

// Export provider names for reuse across the codebase
export const PROVIDERS = Object.keys(PROVIDER_MAPPING) as (keyof typeof PROVIDER_MAPPING)[];
export type Provider = keyof typeof PROVIDER_MAPPING;

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  provider: keyof typeof PROVIDER_MAPPING;
  apiModelName?: string;
  capabilities: ModelCapability[];
  reasoningLevels?: ReasoningLevel[];
  isOpenSource: boolean;
  maxTokens?: number;
  supportsStreaming: boolean;
  supportsFunctions: boolean;
  category: "flagship" | "efficient" | "reasoning" | "vision" | "coding";
}

// Base model configurations
const createModel = (
  id: string,
  name: string,
  description: string,
  provider: keyof typeof PROVIDER_MAPPING,
  apiModelName: string,
  overrides: Partial<ModelConfig> = {}
): ModelConfig => ({
  id,
  name,
  description,
  provider,
  apiModelName,
  capabilities: [],
  isOpenSource: false,
  maxTokens: 8192,
  supportsStreaming: true,
  supportsFunctions: true,
  category: "efficient",
  ...overrides,
});

export const MODELS: ModelConfig[] = [
  // Gemini Models
  createModel(
    "gemini-2.0-flash",
    "Gemini 2.0 Flash",
    "Latest multimodal model with enhanced capabilities",
    "Google",
    "gemini-2.0-flash",
    {
      capabilities: ["image", "search"],
      category: "flagship",
    }
  ),
  createModel(
    "gemini-2.5-flash",
    "Gemini 2.5 Flash",
    "Fast, efficient responses with multimodal support",
    "Google",
    "gemini-2.5-flash-preview-05-20",
    {
      capabilities: ["image", "search"],
    }
  ),
  createModel(
    "gemini-2.5-flash-thinking",
    "Gemini 2.5 Flash (Thinking)",
    "Flash model with enhanced reasoning capabilities",
    "Google",
    "gemini-2.5-flash-exp-native-audio-thinking-dialog",
    {
      capabilities: ["image", "search"],
      category: "reasoning",
    }
  ),
  createModel(
    "gemini-2.5-pro",
    "Gemini 2.5 Pro",
    "Professional-grade model with comprehensive capabilities",
    "Google",
    "gemini-2.5-pro-preview-06-05",
    {
      capabilities: ["image", "pdf", "search", "reasoning"],
      reasoningLevels: ["low", "medium", "high"],
      category: "flagship",
    }
  ),

  // GPT Models
  createModel(
    "gpt-4o",
    "GPT-4o",
    "Advanced multimodal model with reasoning",
    "OpenAI",
    "gpt-4o-2024-11-20",
    {
      capabilities: ["image"],
      maxTokens: 4096,
      category: "flagship",
    }
  ),
  createModel(
    "gpt-4o-mini",
    "GPT-4o Mini",
    "Efficient version of GPT-4o",
    "OpenAI",
    "gpt-4o-mini",
    {
      capabilities: ["image"],
      maxTokens: 4096,
    }
  ),
  createModel("o3-mini", "o3-mini", "Compact reasoning model", "OpenAI", "o3-mini", {
    capabilities: ["reasoning"],
    reasoningLevels: ["low", "medium", "high"],
    maxTokens: 4096,
    supportsFunctions: false,
    category: "reasoning",
  }),
  createModel(
    "o4-mini",
    "o4-mini",
    "Next-generation compact reasoning model",
    "OpenAI",
    "o4-mini-2025-04-16",
    {
      capabilities: ["reasoning", "image"],
      reasoningLevels: ["low", "medium", "high"],
      maxTokens: 4096,
      supportsFunctions: false,
      category: "reasoning",
    }
  ),
  createModel(
    "gpt-4.5",
    "GPT-4.5",
    "Enhanced GPT model with BYOK and thinking",
    "OpenAI",
    "gpt-4.5",
    {
      capabilities: ["image"],
      category: "flagship",
    }
  ),

  // GPT-4.1 Series
  createModel(
    "gpt-4.1",
    "GPT-4.1",
    "Latest model release with enhanced capabilities",
    "OpenAI",
    "gpt-4.1",
    {
      capabilities: ["image"],
      maxTokens: 32768,
      category: "flagship",
    }
  ),
  createModel(
    "gpt-4.1-mini",
    "GPT-4.1 Mini",
    "Efficient version of GPT-4.1 with balanced performance",
    "OpenAI",
    "gpt-4.1-mini",
    {
      capabilities: ["image"],
      maxTokens: 32768,
    }
  ),
  createModel(
    "gpt-4.1-nano",
    "GPT-4.1 Nano",
    "Fastest 4.1 model optimized for speed",
    "OpenAI",
    "gpt-4.1-nano",
    {
      capabilities: ["image"],
      maxTokens: 32768,
    }
  ),

  // Image Generation
  createModel(
    "gpt-image-1",
    "GPT Image 1",
    "Advanced AI image generation model from OpenAI",
    "OpenAI",
    "gpt-image-1",
    {
      capabilities: ["image-generation", "image"],
      maxTokens: 4096,
      supportsStreaming: false,
      supportsFunctions: false,
      category: "vision",
    }
  ),

  // Anthropic Models
  createModel(
    "claude-3.5-sonnet",
    "Claude 3.5 Sonnet",
    "High performance with vision capabilities",
    "Anthropic",
    "claude-3-5-sonnet-20241022",
    {
      capabilities: ["image", "pdf"],
      category: "flagship",
    }
  ),
  createModel(
    "claude-3.7-sonnet",
    "Claude 3.7 Sonnet",
    "Enhanced Sonnet with extended capabilities",
    "Anthropic",
    "claude-3-7-sonnet-20250219",
    {
      capabilities: ["image", "pdf"],
      category: "flagship",
    }
  ),
  createModel(
    "claude-3.7-sonnet-reasoning",
    "Claude 3.7 Sonnet (Reasoning)",
    "Enhanced Sonnet with extended thinking mode",
    "Anthropic",
    "claude-3-7-sonnet-20250219",
    {
      capabilities: ["image", "pdf", "reasoning"],
      reasoningLevels: ["low", "medium", "high"],
      category: "reasoning",
    }
  ),
  createModel(
    "claude-4-sonnet",
    "Claude 4 Sonnet",
    "Next-generation Claude with advanced capabilities",
    "Anthropic",
    "claude-sonnet-4-20250514",
    {
      capabilities: ["image", "pdf"],
      category: "flagship",
    }
  ),
  createModel(
    "claude-4-sonnet-reasoning",
    "Claude 4 Sonnet (Reasoning)",
    "Next-generation Claude with advanced reasoning",
    "Anthropic",
    "claude-sonnet-4-20250514",
    {
      capabilities: ["image", "pdf", "reasoning"],
      reasoningLevels: ["low", "medium", "high"],
      category: "reasoning",
    }
  ),
  createModel(
    "claude-4-opus",
    "Claude 4 Opus",
    "Superior analysis capabilities with reasoning",
    "Anthropic",
    "claude-opus-4-20250514",
    {
      capabilities: ["image", "pdf", "reasoning"],
      category: "flagship",
    }
  ),

  // Groq Models (Llama via Groq)
  createModel(
    "llama-3.3-70b-groq",
    "Llama 3.3 70B (Groq)",
    "Fast Llama 3.3 70B with tool calling support",
    "Groq",
    "llama-3.3-70b-versatile",
    {
      isOpenSource: true,
      category: "flagship",
    }
  ),
  createModel(
    "llama-4-scout-groq",
    "Llama 4 Scout (Groq)",
    "Fast Llama 4 Scout with vision and tool calling",
    "Groq",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    {
      capabilities: ["image"],
      isOpenSource: true,
      category: "vision",
    }
  ),
  createModel(
    "llama-3.1-8b-groq",
    "Llama 3.1 8B (Groq)",
    "Fast and efficient Llama 3.1 8B with tool calling",
    "Groq",
    "llama-3.1-8b-instant",
    {
      isOpenSource: true,
      category: "efficient",
    }
  ),

  // DeepSeek Models
  createModel(
    "deepseek-v3-chat",
    "DeepSeek V3 Chat",
    "Conversational AI model (DeepSeek-V3-0324)",
    "DeepSeek",
    "deepseek-chat",
    { isOpenSource: true }
  ),
  createModel(
    "deepseek-r1-preview",
    "DeepSeek R1 Preview",
    "Advanced reasoning model (DeepSeek-R1-0528)",
    "DeepSeek",
    "deepseek-reasoner",
    {
      isOpenSource: true,
      capabilities: ["reasoning"],
      category: "reasoning",
    }
  ),

  // xAI Models
  createModel("grok-3", "Grok 3", "Advanced reasoning model", "xAI", "grok-3", {
    capabilities: [],
    isOpenSource: false,
    category: "flagship",
  }),
  createModel("grok-3-mini", "Grok 3 Mini", "Efficient reasoning model", "xAI", "grok-3-mini", {
    capabilities: ["reasoning"],
    reasoningLevels: ["low", "high"],
    isOpenSource: false,
    maxTokens: 4096,
    category: "reasoning",
  }),

  // OpenRouter Models - Free Qwen Series Only
  createModel(
    "qwen3-30b-a3b-free",
    "Qwen3 30B A3B (Free)",
    "Free 30.5B parameter MoE model with superior reasoning, coding, and dialogue capabilities (No tool support)",
    "OpenRouter",
    "qwen/qwen3-30b-a3b:free",
    {
      isOpenSource: true,
      capabilities: ["reasoning"],
      category: "flagship",
      maxTokens: 40960,
      supportsFunctions: false,
    }
  ),
  createModel(
    "qwen-2.5-coder-32b-free",
    "Qwen2.5 Coder 32B (Free)",
    "Free 32B parameter model optimized for code generation and reasoning (No tool support)",
    "OpenRouter",
    "qwen/qwen-2.5-coder-32b-instruct:free",
    {
      isOpenSource: true,
      capabilities: ["reasoning"],
      category: "coding",
      maxTokens: 131072,
      supportsFunctions: false,
    }
  ),
  createModel(
    "qwq-32b-free",
    "QwQ 32B (Free)",
    "Free 32B reasoning model capable of enhanced logical thinking and problem solving (No tool support)",
    "OpenRouter",
    "qwen/qwq-32b:free",
    {
      isOpenSource: true,
      capabilities: ["reasoning"],
      category: "reasoning",
      maxTokens: 131072,
      supportsFunctions: false,
    }
  ),
];

// Consolidated helper functions
export const getModelById = (id: string) => MODELS.find((m) => m.id === id);
export const getModelsByProvider = (provider: ModelConfig["provider"]) =>
  MODELS.filter((m) => m.provider === provider);
export const getModelsByCapability = (capability: ModelCapability) =>
  MODELS.filter((m) => m.capabilities.includes(capability));
export const getModelsByCategory = (category: ModelConfig["category"]) =>
  MODELS.filter((m) => m.category === category);

// Computed properties
export const REASONING_MODELS = MODELS.filter((m) => m.capabilities.includes("reasoning")).map(
  (m) => m.id
);
export const VISION_MODELS = MODELS.filter((m) => m.capabilities.includes("image")).map(
  (m) => m.id
);
export const IMAGE_GEN_MODELS = MODELS.filter((m) =>
  m.capabilities.includes("image-generation")
).map((m) => m.id);

// Defaults
export const DEFAULT_MODEL = "gemini-2.5-flash";
export const DEFAULT_FAVORITES = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "claude-3.5-sonnet",
  "claude-4-sonnet-reasoning",
  "gpt-4o",
  "llama-3.3-70b-groq",
  "deepseek-r1-preview",
  "deepseek-v3-chat",
];

// Dynamic model groupings
export const MODEL_GROUPS = {
  Recommended: ["gemini-2.5-flash", "claude-3.5-sonnet", "gpt-4o", "llama-3.3-70b-groq"],
  Reasoning: REASONING_MODELS,
  "Vision & Multimodal": VISION_MODELS,
  "Image Generation": IMAGE_GEN_MODELS,
  "All Models": MODELS.map((m) => m.id),
} as const;
