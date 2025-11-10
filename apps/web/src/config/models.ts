export type ModelCapability = "image" | "pdf" | "search" | "reasoning" | "tools";
export type ReasoningLevel = "low" | "medium" | "high";

export const CAPABILITY_LABELS = {
  image: "Vision",
  pdf: "PDFs",
  search: "Search",
  reasoning: "Reasoning",
  tools: "Tools",
} as const;

export const PROVIDER_MAPPING = {
  // OpenRouter serves as unified gateway to all providers
  // Models are accessed via OpenRouter's provider/model-id format
  OpenRouter: { name: "openrouter", supported: true },
} as const;

export const PROVIDERS = Object.keys(PROVIDER_MAPPING) as (keyof typeof PROVIDER_MAPPING)[];
export type Provider = keyof typeof PROVIDER_MAPPING;

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  provider: Provider;
  apiModelName?: string;
  capabilities: ModelCapability[];
  reasoningLevels?: ReasoningLevel[];
  isOpenSource: boolean;
  maxTokens?: number;
  supportsStreaming: boolean;
  supportsFunctions: boolean;
  category: "flagship" | "efficient" | "reasoning" | "vision" | "coding";
}

// Capability presets
const multimodal: ModelCapability[] = ["image", "pdf", "tools"];
const reasoning: ModelCapability[] = ["reasoning", "tools"];
const reasoningMultimodal: ModelCapability[] = ["reasoning", "image", "pdf", "tools"];
const reasoningLevels: ReasoningLevel[] = ["low", "medium", "high"];

// Minimal model creator
const m = (
  id: string,
  name: string,
  provider: Provider,
  apiModelName: string,
  overrides: Partial<
    Omit<ModelConfig, "id" | "name" | "provider" | "apiModelName" | "supportsFunctions">
  > = {}
): ModelConfig => ({
  id,
  name,
  provider,
  apiModelName,
  description: overrides.description || `${name} from ${provider}`,
  capabilities: overrides.capabilities || ["tools"],
  reasoningLevels: overrides.reasoningLevels,
  isOpenSource: overrides.isOpenSource ?? false,
  maxTokens: overrides.maxTokens ?? 8192,
  supportsStreaming: overrides.supportsStreaming ?? true,
  supportsFunctions: (overrides.capabilities || ["tools"]).includes("tools"),
  category: overrides.category ?? "efficient",
});

export const MODELS: ModelConfig[] = [
  // Google Models via OpenRouter
  m("gemini-2.0-flash", "Gemini 2.0 Flash", "OpenRouter", "google/gemini-2.0-flash-exp", {
    description: "Latest multimodal model with enhanced capabilities",
    capabilities: [...multimodal, "search"],
    category: "flagship",
  }),
  m("gemini-2.5-flash", "Gemini 2.5 Flash", "OpenRouter", "google/gemini-2.5-flash", {
    capabilities: [...multimodal, "search"]
  }),
  m("gemini-2.5-pro", "Gemini 2.5 Pro", "OpenRouter", "google/gemini-2.5-pro", {
    capabilities: [...reasoningMultimodal, "search"],
    reasoningLevels: [...reasoningLevels],
    category: "flagship"
  }),

  // OpenAI Models via OpenRouter
  m("gpt-5", "GPT-5", "OpenRouter", "openai/gpt-5", {
    description: "Latest flagship model with advanced reasoning and multimodal capabilities",
    capabilities: reasoningMultimodal,
    reasoningLevels: [...reasoningLevels],
    maxTokens: 256000,
    category: "flagship"
  }),
  m("gpt-5-mini", "GPT-5 Mini", "OpenRouter", "openai/gpt-5-mini", {
    capabilities: multimodal,
    maxTokens: 128000
  }),
  m("gpt-5-nano", "GPT-5 Nano", "OpenRouter", "openai/gpt-5-nano", {
    capabilities: multimodal,
    maxTokens: 64000
  }),
  m("gpt-4o", "GPT-4o", "OpenRouter", "openai/gpt-4o-2024-11-20", {
    capabilities: multimodal,
    maxTokens: 4096,
    category: "flagship"
  }),
  m("gpt-4o-mini", "GPT-4o Mini", "OpenRouter", "openai/gpt-4o-mini", {
    capabilities: multimodal,
    maxTokens: 4096
  }),
  m("o3-mini", "o3-mini", "OpenRouter", "openai/o3-mini", {
    capabilities: ["reasoning", "pdf"],
    reasoningLevels: [...reasoningLevels],
    maxTokens: 4096,
    category: "reasoning"
  }),
  m("o4-mini", "o4-mini", "OpenRouter", "openai/o4-mini-2025-04-16", {
    capabilities: reasoningMultimodal,
    reasoningLevels: [...reasoningLevels],
    maxTokens: 4096,
    category: "reasoning"
  }),
  m("gpt-4.5", "GPT-4.5", "OpenRouter", "openai/gpt-4.5", {
    capabilities: multimodal,
    category: "flagship"
  }),
  m("gpt-4.1", "GPT-4.1", "OpenRouter", "openai/gpt-4.1", {
    capabilities: multimodal,
    maxTokens: 32768,
    category: "flagship"
  }),
  m("gpt-4.1-mini", "GPT-4.1 Mini", "OpenRouter", "openai/gpt-4.1-mini", {
    capabilities: multimodal,
    maxTokens: 32768
  }),
  m("gpt-4.1-nano", "GPT-4.1 Nano", "OpenRouter", "openai/gpt-4.1-nano", {
    capabilities: multimodal,
    maxTokens: 32768
  }),

  // Anthropic Models via OpenRouter
  m("claude-3.5-sonnet", "Claude 3.5 Sonnet", "OpenRouter", "anthropic/claude-3-5-sonnet-20241022", {
    capabilities: multimodal,
    category: "flagship"
  }),
  m("claude-3.7-sonnet", "Claude 3.7 Sonnet", "OpenRouter", "anthropic/claude-3-7-sonnet-20250219", {
    capabilities: multimodal,
    category: "flagship"
  }),
  m("claude-3.7-sonnet-reasoning", "Claude 3.7 Sonnet (Reasoning)", "OpenRouter", "anthropic/claude-3-7-sonnet-20250219", {
    capabilities: reasoningMultimodal,
    reasoningLevels: [...reasoningLevels],
    category: "reasoning"
  }),
  m("claude-4-sonnet", "Claude 4 Sonnet", "OpenRouter", "anthropic/claude-sonnet-4-20250514", {
    capabilities: multimodal,
    category: "flagship"
  }),
  m("claude-4-sonnet-reasoning", "Claude 4 Sonnet (Reasoning)", "OpenRouter", "anthropic/claude-sonnet-4-20250514", {
    capabilities: reasoningMultimodal,
    reasoningLevels: [...reasoningLevels],
    category: "reasoning"
  }),
  m("claude-4-opus", "Claude 4 Opus", "OpenRouter", "anthropic/claude-opus-4-20250514", {
    capabilities: reasoningMultimodal,
    category: "flagship"
  }),

  // Meta Llama Models via OpenRouter
  m("llama-3.3-70b-groq", "Llama 3.3 70B (Groq)", "OpenRouter", "meta-llama/llama-3.3-70b-versatile", {
    isOpenSource: true,
    category: "flagship"
  }),
  m("llama-4-scout-groq", "Llama 4 Scout (Groq)", "OpenRouter", "meta-llama/llama-4-scout-17b-16e-instruct", {
    capabilities: multimodal,
    isOpenSource: true,
    category: "vision"
  }),
  m("llama-3.1-8b-groq", "Llama 3.1 8B (Groq)", "OpenRouter", "meta-llama/llama-3.1-8b-instruct", {
    isOpenSource: true
  }),

  // DeepSeek Models via OpenRouter
  m("deepseek-v3-chat", "DeepSeek V3 Chat", "OpenRouter", "deepseek/deepseek-chat", {
    isOpenSource: true
  }),
  m("deepseek-r1-preview", "DeepSeek R1 Preview", "OpenRouter", "deepseek/deepseek-reasoner", {
    capabilities: reasoning,
    isOpenSource: true,
    category: "reasoning"
  }),

  // xAI Grok Models via OpenRouter
  m("grok-3", "Grok 3", "OpenRouter", "xai/grok-3-beta", {
    capabilities: ["pdf", "tools"],
    category: "flagship"
  }),
  m("grok-3-mini", "Grok 3 Mini", "OpenRouter", "xai/grok-3-mini", {
    capabilities: [...reasoning, "pdf"],
    reasoningLevels: ["low", "high"],
    maxTokens: 4096,
    category: "reasoning"
  }),

  // Qwen Models via OpenRouter (Free Tier)
  m("qwen3-30b-a3b-free", "Qwen3 30B A3B (Free)", "OpenRouter", "qwen/qwen3-30b-a3b:free", {
    capabilities: ["reasoning"],
    isOpenSource: true,
    category: "flagship",
    maxTokens: 40960
  }),
  m("qwen-2.5-coder-32b-free", "Qwen2.5 Coder 32B (Free)", "OpenRouter", "qwen/qwen-2.5-coder-32b-instruct:free", {
    capabilities: ["reasoning"],
    isOpenSource: true,
    category: "coding",
    maxTokens: 131072
  }),
  m("qwq-32b-free", "QwQ 32B (Free)", "OpenRouter", "qwen/qwq-32b:free", {
    capabilities: ["reasoning"],
    isOpenSource: true,
    category: "reasoning",
    maxTokens: 131072
  })
];

// Helper functions
export const getModelById = (id: string) => MODELS.find((m) => m.id === id);
export const getModelsByProvider = (provider: Provider) =>
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
export const IMAGE_GEN_MODELS: string[] = [];

// Type helpers
type LiteralUnion<T extends U, U = string> = T | (U & {});
type ExactModelIds =
  | "gemini-2.0-flash"
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"
  | "gpt-5"
  | "gpt-5-mini"
  | "gpt-5-nano"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "o3-mini"
  | "o4-mini"
  | "gpt-4.5"
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "claude-3.5-sonnet"
  | "claude-3.7-sonnet"
  | "claude-3.7-sonnet-reasoning"
  | "claude-4-sonnet"
  | "claude-4-sonnet-reasoning"
  | "claude-4-opus"
  | "llama-3.3-70b-groq"
  | "llama-4-scout-groq"
  | "llama-3.1-8b-groq"
  | "deepseek-v3-chat"
  | "deepseek-r1-preview"
  | "grok-3"
  | "grok-3-mini"
  | "qwen3-30b-a3b-free"
  | "qwen-2.5-coder-32b-free"
  | "qwq-32b-free";

export type ModelId = LiteralUnion<ExactModelIds>;

// Defaults
export const DEFAULT_MODEL = "gpt-5";
export const DEFAULT_FAVORITES = [
  "gpt-5",
  "gpt-5-mini",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "claude-3.5-sonnet",
  "claude-4-sonnet-reasoning",
  "gpt-4o",
  "llama-3.3-70b-groq",
  "deepseek-r1-preview",
  "deepseek-v3-chat",
] as const satisfies readonly ModelId[];

// Showcase models for feature cards
export const SHOWCASE_MODELS = [
  "gpt-5",
  "claude-4-sonnet",
  "gemini-2.5-pro",
  "grok-3",
  "llama-3.3-70b-groq",
  "deepseek-r1-preview",
  "qwen3-30b-a3b-free",
] as const satisfies readonly ModelId[];

export const getShowcaseModels = (): ModelConfig[] =>
  SHOWCASE_MODELS.map((id) => MODELS.find((m) => m.id === id)!);

// Dynamic model groupings
export const MODEL_GROUPS = {
  Recommended: [
    "gpt-5",
    "gpt-5-mini",
    "gemini-2.5-flash",
    "claude-3.5-sonnet",
    "gpt-4o",
    "llama-3.3-70b-groq",
  ],
  Reasoning: REASONING_MODELS,
  "Vision & Multimodal": VISION_MODELS,
  "All Models": MODELS.map((m) => m.id),
} as const;
