import { UIMessage } from "ai";
import { z } from "zod";
import type { GroundingMetadata } from "./provider-metadata";
import type { ToolTypes } from "@/app/api/chat/utils/tools";

// Re-export ToolTypes for use in components
export type { ToolTypes };

// Clean message metadata schema - only what AI SDK v5 officially supports
export const messageMetadataSchema = z.object({
  // Model information (AI SDK standard)
  model: z.string().optional(),
  modelProvider: z.string().optional(),

  // Token usage (AI SDK standard)
  totalTokens: z.number().optional(),
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  reasoningTokens: z.number().optional(),

  // Duration (AI SDK standard)
  duration: z.number().optional(),

  // Timestamps (AI SDK standard)
  createdAt: z.number().optional(),

  // Configuration (app-specific but lightweight)
  reasoningLevel: z.enum(["low", "medium", "high"]).optional(),
  searchEnabled: z.boolean().optional(),

  // Internal database fields (for onFinish callback only)
  userId: z.string().optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Data part schemas for streaming data (AI SDK v5)
export const dataPartSchemas = {
  // Grounding data from Google models - streamed after onFinish
  grounding: z.object({
    hasGrounding: z.boolean(),
    grounding: z.custom<GroundingMetadata>(),
    timestamp: z.number().optional(),
  }),

  // Step-level grounding for multi-step executions
  stepGrounding: z.object({
    hasGrounding: z.boolean(),
    grounding: z.custom<GroundingMetadata>(),
    stepIndex: z.number(),
    timestamp: z.number().optional(),
  }),

  // Title generated - streamed after onFinish
  titleGenerated: z.object({
    title: z.string(),
    timestamp: z.number().optional(),
  }),
};

export type DataPartSchemas = typeof dataPartSchemas;

export type DataPartTypes = {
  [K in keyof typeof dataPartSchemas]: z.infer<(typeof dataPartSchemas)[K]>;
};

// Custom UIMessage type with proper data part support and auto-inferred tool types (AI SDK v5)
export type CustomUIMessage = UIMessage<MessageMetadata, DataPartTypes, ToolTypes>;

export type { UIMessage } from "ai";
