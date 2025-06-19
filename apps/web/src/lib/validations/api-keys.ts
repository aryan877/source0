import { z } from "zod";

const openAIKeySchema = z
  .string()
  .trim()
  .refine(
    (key) => key.startsWith("sk-proj-") || key.startsWith("sk-"),
    "Invalid OpenAI key format."
  );

const googleKeySchema = z.string().trim().startsWith("AIzaSy", "Invalid Google API key format.");

const anthropicKeySchema = z
  .string()
  .trim()
  .startsWith("sk-ant-", "Invalid Anthropic API key format.");

const xaiKeySchema = z.string().trim().startsWith("xai-", "Invalid xAI API key format.");

const groqKeySchema = z.string().trim().startsWith("gsk_", "Invalid Groq API key format.");

const deepSeekKeySchema = z.string().trim().startsWith("sk-", "Invalid DeepSeek API key format.");

const openRouterKeySchema = z
  .string()
  .trim()
  .startsWith("sk-or-", "Invalid OpenRouter API key format.");

export const apiKeySchema = z.object({
  OpenAI: openAIKeySchema.optional().or(z.literal("")),
  Google: googleKeySchema.optional().or(z.literal("")),
  Anthropic: anthropicKeySchema.optional().or(z.literal("")),
  xAI: xaiKeySchema.optional().or(z.literal("")),
  Groq: groqKeySchema.optional().or(z.literal("")),
  DeepSeek: deepSeekKeySchema.optional().or(z.literal("")),
  OpenRouter: openRouterKeySchema.optional().or(z.literal("")),
});

export const getApiKeySchema = (provider: keyof typeof apiKeySchema.shape) => {
  return apiKeySchema.shape[provider];
};
