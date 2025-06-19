/**
 * Type-safe tool system for AI SDK integration
 */

import type { ToolInvocation } from "ai";
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

// =============================================================================
// Generic Tool System
// =============================================================================

/**
 * Union type of all possible tool data types
 */
export type ToolDataUnion = WebSearchToolData | MemorySaveToolData | MemoryRetrieveToolData;

/**
 * Type guard to check if a tool invocation is complete and has a result
 */
export function isCompleteToolInvocation(
  toolInvocation: ToolInvocation
): toolInvocation is ToolInvocation & { state: "result"; result: unknown } {
  return toolInvocation.state === "result" && toolInvocation.result !== undefined;
}
