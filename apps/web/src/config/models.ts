export type ModelCapability = "image" | "pdf" | "search" | "reasoning";

export type ReasoningLevel = "low" | "medium" | "high";

// Capability labels - single source of truth
export const CAPABILITY_LABELS = {
  image: "Vision",
  pdf: "PDFs",
  search: "Search",
  reasoning: "Reasoning",
} as const;

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  provider: "Google" | "OpenAI" | "Anthropic" | "Meta" | "DeepSeek" | "xAI" | "Qwen";
  capabilities: ModelCapability[];
  reasoningLevels?: ReasoningLevel[];
  isFree: boolean;
  isOpenSource: boolean;
  maxTokens?: number;
  supportsStreaming: boolean;
  supportsFunctions: boolean;
  category: "flagship" | "efficient" | "reasoning" | "vision" | "coding";
}

export const MODELS: ModelConfig[] = [
  // Gemini Models
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Latest multimodal model with enhanced capabilities",
    provider: "Google",
    capabilities: ["image", "search"],
    isFree: true,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "flagship",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fast, efficient responses with multimodal support",
    provider: "Google",
    capabilities: ["image", "search"],
    isFree: true,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "efficient",
  },
  {
    id: "gemini-2.5-flash-thinking",
    name: "Gemini 2.5 Flash (Thinking)",
    description: "Flash model with enhanced reasoning capabilities",
    provider: "Google",
    capabilities: ["image", "search", "reasoning"],
    reasoningLevels: ["low", "medium", "high"],
    isFree: true,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "reasoning",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Professional-grade model with comprehensive capabilities",
    provider: "Google",
    capabilities: ["image", "pdf", "search", "reasoning"],
    reasoningLevels: ["low", "medium", "high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "flagship",
  },

  // GPT Models
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Advanced multimodal model with reasoning",
    provider: "OpenAI",
    capabilities: ["image", "reasoning"],
    reasoningLevels: ["medium", "high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "flagship",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Efficient version of GPT-4o",
    provider: "OpenAI",
    capabilities: ["image"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "efficient",
  },
  {
    id: "o3-mini",
    name: "o3-mini",
    description: "Compact reasoning model",
    provider: "OpenAI",
    capabilities: ["reasoning"],
    reasoningLevels: ["low", "medium", "high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctions: false,
    category: "reasoning",
  },
  {
    id: "o4-mini",
    name: "o4-mini",
    description: "Next-generation compact reasoning model",
    provider: "OpenAI",
    capabilities: ["reasoning"],
    reasoningLevels: ["low", "medium", "high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctions: false,
    category: "reasoning",
  },
  {
    id: "gpt-4.5",
    name: "GPT-4.5",
    description: "Enhanced GPT model with BYOK and thinking",
    provider: "OpenAI",
    capabilities: ["image", "reasoning"],
    reasoningLevels: ["medium", "high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "flagship",
  },

  // Anthropic Models
  {
    id: "claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    description: "High performance with vision capabilities",
    provider: "Anthropic",
    capabilities: ["image", "pdf"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "flagship",
  },
  {
    id: "claude-3.7-sonnet",
    name: "Claude 3.7 Sonnet",
    description: "Enhanced Sonnet with extended thinking mode",
    provider: "Anthropic",
    capabilities: ["image", "pdf", "reasoning"],
    reasoningLevels: ["low", "medium", "high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "reasoning",
  },
  {
    id: "claude-4-sonnet",
    name: "Claude 4 Sonnet",
    description: "Next-generation Claude with advanced reasoning",
    provider: "Anthropic",
    capabilities: ["image", "pdf", "reasoning"],
    reasoningLevels: ["medium", "high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "flagship",
  },
  {
    id: "claude-4-opus",
    name: "Claude 4 Opus",
    description: "Superior reasoning and analysis capabilities",
    provider: "Anthropic",
    capabilities: ["image", "pdf", "reasoning"],
    reasoningLevels: ["high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "flagship",
  },

  // Meta Models
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    description: "Large-scale open-source model",
    provider: "Meta",
    capabilities: [],
    isFree: true,
    isOpenSource: true,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "efficient",
  },
  {
    id: "llama-4-scout",
    name: "Llama 4 Scout",
    description: "Next-gen Llama with vision capabilities",
    provider: "Meta",
    capabilities: ["image"],
    isFree: true,
    isOpenSource: true,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "vision",
  },
  {
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    description: "Advanced Llama variant with enhanced features",
    provider: "Meta",
    capabilities: ["image"],
    isFree: true,
    isOpenSource: true,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "flagship",
  },

  // DeepSeek Models
  {
    id: "deepseek-v3-base",
    name: "DeepSeek V3 Base",
    description: "Advanced reasoning model",
    provider: "DeepSeek",
    capabilities: ["reasoning"],
    reasoningLevels: ["medium", "high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "reasoning",
  },
  {
    id: "deepseek-v3-chat",
    name: "DeepSeek V3 Chat",
    description: "Conversational AI with reasoning",
    provider: "DeepSeek",
    capabilities: ["reasoning"],
    reasoningLevels: ["medium", "high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "reasoning",
  },
  {
    id: "deepseek-r1-preview",
    name: "DeepSeek R1 Preview",
    description: "Next-generation reasoning model",
    provider: "DeepSeek",
    capabilities: ["reasoning"],
    reasoningLevels: ["high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "reasoning",
  },
  {
    id: "deepseek-r1-zero",
    name: "DeepSeek R1 Zero",
    description: "Specialized reasoning model",
    provider: "DeepSeek",
    capabilities: ["reasoning"],
    reasoningLevels: ["high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "reasoning",
  },

  // xAI (Grok) Models
  {
    id: "grok-3",
    name: "Grok 3",
    description: "Advanced reasoning model",
    provider: "xAI",
    capabilities: ["reasoning"],
    reasoningLevels: ["medium", "high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "reasoning",
  },
  {
    id: "grok-3-mini",
    name: "Grok 3 Mini",
    description: "Efficient reasoning model",
    provider: "xAI",
    capabilities: ["reasoning"],
    reasoningLevels: ["low", "high"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "reasoning",
  },

  // Qwen Models
  {
    id: "qwq-32b",
    name: "QwQ 32B",
    description: "Question-answering model with reasoning",
    provider: "Qwen",
    capabilities: ["reasoning"],
    reasoningLevels: ["medium", "high"],
    isFree: true,
    isOpenSource: true,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "reasoning",
  },
  {
    id: "qwen-2.5-32b",
    name: "Qwen 2.5 32B",
    description: "Multimodal model with reasoning and vision",
    provider: "Qwen",
    capabilities: ["image", "reasoning"],
    reasoningLevels: ["medium", "high"],
    isFree: true,
    isOpenSource: true,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "vision",
  },
];

// Helper functions for filtering models
export const getModelsByProvider = (provider: ModelConfig["provider"]) =>
  MODELS.filter((model) => model.provider === provider);

export const getModelsByCapability = (capability: ModelCapability) =>
  MODELS.filter((model) => model.capabilities.includes(capability));

export const getFreeModels = () => MODELS.filter((model) => model.isFree);

export const getOpenSourceModels = () => MODELS.filter((model) => model.isOpenSource);

export const getModelsByCategory = (category: ModelConfig["category"]) =>
  MODELS.filter((model) => model.category === category);

export const getModelById = (id: string) => MODELS.find((model) => model.id === id);

export const getReasoningModels = () =>
  MODELS.filter((model) => model.capabilities.includes("reasoning"));

export const getVisionModels = () => MODELS.filter((model) => model.capabilities.includes("image"));

// Default model selection
export const DEFAULT_MODEL = "gemini-2.5-flash";

// Default favorites - single source of truth
export const DEFAULT_FAVORITES = ["gemini-2.5-flash", "claude-3.5-sonnet", "gpt-4o"] as const;

// Model groupings for UI
export const MODEL_GROUPS = {
  Recommended: ["gemini-2.5-flash", "claude-3.5-sonnet", "gpt-4o", "deepseek-v3-chat"],
  "Free Models": ["gemini-2.5-flash", "gemini-2.0-flash", "llama-3.3-70b", "qwq-32b"],
  Reasoning: ["claude-3.7-sonnet", "gemini-2.5-flash-thinking", "o3-mini", "deepseek-r1-preview"],
  "Vision & Multimodal": ["gpt-4o", "claude-4-sonnet", "llama-4-scout", "qwen-2.5-32b"],
  "All Models": [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-thinking",
    "gemini-2.5-pro",
    "gpt-4o",
    "gpt-4o-mini",
    "o3-mini",
    "o4-mini",
    "gpt-4.5",
    "claude-3.5-sonnet",
    "claude-3.7-sonnet",
    "claude-4-sonnet",
    "claude-4-opus",
    "llama-3.3-70b",
    "llama-4-scout",
    "llama-4-maverick",
    "deepseek-v3-base",
    "deepseek-v3-chat",
    "deepseek-r1-preview",
    "deepseek-r1-zero",
    "grok-3",
    "grok-3-mini",
    "qwq-32b",
    "qwen-2.5-32b",
  ],
} as const;
