import { UIMessage } from "ai";
import { z } from "zod";
import type { GroundingMetadata } from "./provider-metadata";

// Clean message metadata schema - only what we actually use
export const messageMetadataSchema = z.object({
  // Model information
  model: z.string().optional(),
  modelProvider: z.string().optional(),

  // Token usage
  totalTokens: z.number().optional(),
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),

  // Timestamps
  createdAt: z.number().optional(),

  // Configuration
  reasoningLevel: z.enum(["low", "medium", "high"]).optional(),
  searchEnabled: z.boolean().optional(),

  // Grounding (for web search results)
  grounding: z.custom<GroundingMetadata>().optional(),
  hasGrounding: z.boolean().optional(),
  
  // Step-level grounding for multi-step executions
  stepGrounding: z.object({
    hasGrounding: z.boolean(),
    grounding: z.custom<GroundingMetadata>(),
    stepIndex: z.number(),
  }).optional(),

  // Safety ratings from Google models
  safetyRatings: z.record(z.unknown()).optional(),

  // Internal database fields (for onFinish callback)
  userId: z.string().optional(),
  titleGenerated: z.string().optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Simple custom UIMessage type - tools are handled automatically by AI SDK
export type CustomUIMessage = UIMessage<MessageMetadata>;

// Export commonly used types
export type { UIMessage } from "ai";
