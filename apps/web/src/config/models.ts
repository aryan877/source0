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

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  provider: "Google" | "OpenAI" | "Anthropic" | "Meta" | "DeepSeek" | "xAI" | "Qwen";
  apiModelName?: string; // The actual model name used in API calls
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
    apiModelName: "gemini-2.0-flash",
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
    apiModelName: "gemini-2.5-flash-preview-05-20",
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
    apiModelName: "gemini-2.5-flash-exp-native-audio-thinking-dialog",
    capabilities: ["image", "search"],
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
    apiModelName: "gemini-2.5-pro-preview-06-05",
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
    apiModelName: "gpt-4o",
    capabilities: ["image"],
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
    apiModelName: "gpt-4o-mini",
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
    apiModelName: "o3-mini",
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
    apiModelName: "o4-mini-2025-04-16",
    capabilities: ["reasoning", "image"],
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
    apiModelName: "gpt-4.5",
    capabilities: ["image"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "flagship",
  },

  // GPT-4.1 Series Models
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    description: "Latest model release with enhanced capabilities",
    provider: "OpenAI",
    apiModelName: "gpt-4.1",
    capabilities: ["image"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 32768,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "flagship",
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    description: "Efficient version of GPT-4.1 with balanced performance",
    provider: "OpenAI",
    apiModelName: "gpt-4.1-mini",
    capabilities: ["image"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 32768,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "efficient",
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    description: "Fastest 4.1 model optimized for speed",
    provider: "OpenAI",
    apiModelName: "gpt-4.1-nano",
    capabilities: ["image"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 32768,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "efficient",
  },

  // Image Generation Model
  {
    id: "gpt-image-1",
    name: "GPT Image 1",
    description: "Advanced AI image generation model from OpenAI",
    provider: "OpenAI",
    apiModelName: "gpt-image-1",
    capabilities: ["image-generation"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 4096,
    supportsStreaming: false,
    supportsFunctions: false,
    category: "vision",
  },

  // Anthropic Models
  {
    id: "claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    description: "High performance with vision capabilities",
    provider: "Anthropic",
    apiModelName: "claude-3-5-sonnet-20241022",
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
    description: "Enhanced Sonnet with extended capabilities",
    provider: "Anthropic",
    apiModelName: "claude-3-7-sonnet-20250219",
    capabilities: ["image", "pdf"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "flagship",
  },
  {
    id: "claude-3.7-sonnet-reasoning",
    name: "Claude 3.7 Sonnet (Reasoning)",
    description: "Enhanced Sonnet with extended thinking mode",
    provider: "Anthropic",
    apiModelName: "claude-3-7-sonnet-20250219",
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
    description: "Next-generation Claude with advanced capabilities",
    provider: "Anthropic",
    apiModelName: "claude-sonnet-4-20250514",
    capabilities: ["image", "pdf"],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "flagship",
  },
  {
    id: "claude-4-sonnet-reasoning",
    name: "Claude 4 Sonnet (Reasoning)",
    description: "Next-generation Claude with advanced reasoning",
    provider: "Anthropic",
    apiModelName: "claude-sonnet-4-20250514",
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
    id: "claude-4-opus",
    name: "Claude 4 Opus",
    description: "Superior analysis capabilities with reasoning",
    provider: "Anthropic",
    apiModelName: "claude-opus-4-20250514",
    capabilities: ["image", "pdf", "reasoning"],
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
    apiModelName: "meta-llama/Llama-3.3-70B-Instruct",
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
    apiModelName: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
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
    apiModelName: "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
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
    description: "Advanced language model",
    provider: "DeepSeek",
    apiModelName: "deepseek-ai/DeepSeek-V3-Base",
    capabilities: [],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "efficient",
  },
  {
    id: "deepseek-v3-chat",
    name: "DeepSeek V3 Chat",
    description: "Conversational AI model",
    provider: "DeepSeek",
    apiModelName: "deepseek-ai/DeepSeek-V3",
    capabilities: [],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "efficient",
  },
  {
    id: "deepseek-r1-preview",
    name: "DeepSeek R1 Preview",
    description: "Advanced language model",
    provider: "DeepSeek",
    apiModelName: "deepseek-reasoner",
    capabilities: [],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "efficient",
  },
  {
    id: "deepseek-r1-zero",
    name: "DeepSeek R1 Zero",
    description: "Specialized language model",
    provider: "DeepSeek",
    apiModelName: "deepseek-r1-zero",
    capabilities: [],
    isFree: false,
    isOpenSource: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctions: true,
    category: "efficient",
  },

  // xAI (Grok) Models
  {
    id: "grok-3",
    name: "Grok 3",
    description: "Advanced reasoning model",
    provider: "xAI",
    apiModelName: "grok-3",
    capabilities: ["reasoning"],
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
    apiModelName: "grok-3-mini",
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
    apiModelName: "Qwen/QwQ-32B-Preview",
    capabilities: ["reasoning"],
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
    description: "Multimodal model with vision capabilities",
    provider: "Qwen",
    apiModelName: "Qwen/Qwen2.5-32B-Instruct",
    capabilities: ["image"],
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

export const getImageGenerationModels = () =>
  MODELS.filter((model) => model.capabilities.includes("image-generation"));

// Default model selection
export const DEFAULT_MODEL = "gemini-2.5-flash";

// Default favorites - dynamically selected based on categories and popularity
export const DEFAULT_FAVORITES = MODELS.filter(
  (model) =>
    (model.category === "flagship" || model.category === "efficient") &&
    (model.provider === "Google" || model.provider === "Anthropic" || model.provider === "OpenAI")
)
  .slice(0, 3)
  .map((model) => model.id);

// Dynamic model groupings based on model properties - no hardcoding!
export const MODEL_GROUPS = {
  Recommended: MODELS.filter(
    (model) => model.category === "flagship" || (model.category === "efficient" && model.isFree)
  )
    .slice(0, 4)
    .map((model) => model.id),

  "Free Models": getFreeModels().map((model) => model.id),

  Reasoning: getReasoningModels().map((model) => model.id),

  "Vision & Multimodal": getVisionModels().map((model) => model.id),

  "Image Generation": getImageGenerationModels().map((model) => model.id),

  "All Models": MODELS.map((model) => model.id),
} as const;
