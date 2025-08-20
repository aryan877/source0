/**
 * Type-safe tool system for AI SDK integration
 */

import type { WebSearchResult } from "./web-search";

// =============================================================================
// Core Tool Types
// =============================================================================

/**
 * Base tool data interface that all tool results should extend
 */
export interface BaseToolData {
  toolName: string;
}

/**
 * Web search specific tool data
 */
export interface WebSearchToolData extends BaseToolData {
  toolName: "webSearch";
  originalQuery: string;
  generatedQueries: string[];
  searchResults: WebSearchResult[];
  totalResults: number;
  hasErrors: boolean;
  errors: string[];
}

/**
 * Memory save tool data
 */
export interface MemorySaveToolData extends BaseToolData {
  toolName: "memorySave";
  memoryId: string;
  content: string;
  metadata: Record<string, string | number | boolean>;
  userId: string;
  sessionId?: string;
  success: boolean;
  message: string;
}

/**
 * Memory retrieve tool data
 */
export interface MemoryRetrieveToolData extends BaseToolData {
  toolName: "memoryRetrieve";
  query: string;
  memories: Array<{
    id: string;
    content: string;
    metadata: Record<string, string | number | boolean>;
    relevanceScore: number;
    createdAt: string;
    updatedAt: string;
  }>;
  totalFound: number;
  strategy: string;
  success: boolean;
  message: string;
}

/**
 * Image generation tool data - success case
 */
export interface ImageGenerationToolResult extends BaseToolData {
  toolName: "imageGeneration";
  success: true;
  imageUrl: string;
  imageId: string;
  filePath: string;
  prompt: string;
  size: string;
  style: string;
  message: string;
}

/**
 * Image generation tool data - error case
 */
export interface ImageGenerationToolError extends BaseToolData {
  toolName: "imageGeneration";
  success: false;
  error: string;
  prompt: string;
  message: string;
}

/**
 * Union type for image generation tool responses
 */
export type ImageGenerationToolData = ImageGenerationToolResult | ImageGenerationToolError;
