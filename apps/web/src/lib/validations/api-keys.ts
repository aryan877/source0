import { type Provider } from "@/config/models";
import { z } from "zod";

// Provider key validation patterns - derived from models config
const PROVIDER_KEY_PATTERNS: Record<Provider, { prefixes: string[]; message: string }> = {
  OpenAI: {
    prefixes: ["sk-proj-", "sk-"],
    message: "Invalid OpenAI key format."
  },
  Google: {
    prefixes: ["AIzaSy"],
    message: "Invalid Google API key format."
  },
  Anthropic: {
    prefixes: ["sk-ant-"],
    message: "Invalid Anthropic API key format."
  },
  xAI: {
    prefixes: ["xai-"],
    message: "Invalid xAI API key format."
  },
  Groq: {
    prefixes: ["gsk_"],
    message: "Invalid Groq API key format."
  },
  DeepSeek: {
    prefixes: ["sk-"],
    message: "Invalid DeepSeek API key format."
  },
  OpenRouter: {
    prefixes: ["sk-or-"],
    message: "Invalid OpenRouter API key format."
  }
} as const;

// Create validation schema for a provider
const createProviderKeySchema = (provider: Provider) => {
  const { prefixes, message } = PROVIDER_KEY_PATTERNS[provider];
  return z
    .string()
    .trim()
    .refine(
      (key) => prefixes.some(prefix => key.startsWith(prefix)),
      message
    );
};


export const getApiKeySchema = (provider: Provider) => {
  return createProviderKeySchema(provider);
};
 