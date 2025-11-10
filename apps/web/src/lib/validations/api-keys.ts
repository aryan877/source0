import { type Provider } from "@/config/models";
import { z } from "zod";

// Provider key validation patterns - OpenRouter only
const PROVIDER_KEY_PATTERNS: Record<Provider, { prefixes: string[]; message: string }> = {
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
 