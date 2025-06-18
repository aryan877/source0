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

const genericKeySchema = z.string().trim().min(1, "API key cannot be empty.");

export const apiKeySchema = z.object({
  OpenAI: openAIKeySchema.optional().or(z.literal("")),
  Google: googleKeySchema.optional().or(z.literal("")),
  Anthropic: anthropicKeySchema.optional().or(z.literal("")),
  xAI: xaiKeySchema.optional().or(z.literal("")),
  Meta: genericKeySchema.optional().or(z.literal("")),
  DeepSeek: genericKeySchema.optional().or(z.literal("")),
  Qwen: genericKeySchema.optional().or(z.literal("")),
});

export const getApiKeySchema = (provider: keyof typeof apiKeySchema.shape) => {
  return apiKeySchema.shape[provider];
};
