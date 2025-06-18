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
 * Generic tool result parser function type
 */
export type ToolResultParser<T extends BaseToolData = BaseToolData> = (result: string) => T | null;

/**
 * Mapping of tool names to their data types
 */
export interface ToolDataMap {
  webSearch: WebSearchToolData;
  memorySave: MemorySaveToolData;
  memoryRetrieve: MemoryRetrieveToolData;
}

/**
 * Type-safe tool result parsers registry
 */
export const toolResultParsers: {
  [K in keyof ToolDataMap]: ToolResultParser<ToolDataMap[K]>;
} = {
  webSearch: parseWebSearchResult,
  memorySave: parseMemorySaveResult,
  memoryRetrieve: parseMemoryRetrieveResult,
} as const;

// =============================================================================
// Parser Functions
// =============================================================================

/**
 * Utility function to safely parse web search tool result
 */
export function parseWebSearchResult(result: string): WebSearchToolData | null {
  try {
    const parsed = JSON.parse(result);

    // Basic validation
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.originalQuery === "string" &&
      Array.isArray(parsed.generatedQueries) &&
      Array.isArray(parsed.searchResults) &&
      typeof parsed.totalResults === "number" &&
      typeof parsed.hasErrors === "boolean" &&
      Array.isArray(parsed.errors)
    ) {
      return {
        ...parsed,
        toolName: "webSearch",
      } as WebSearchToolData;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Utility function to safely parse memory save tool result
 */
export function parseMemorySaveResult(result: string): MemorySaveToolData | null {
  try {
    const parsed = JSON.parse(result);

    // Basic validation
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.memoryId === "string" &&
      typeof parsed.content === "string" &&
      typeof parsed.metadata === "object" &&
      typeof parsed.userId === "string" &&
      typeof parsed.success === "boolean" &&
      typeof parsed.message === "string"
    ) {
      return {
        ...parsed,
        toolName: "memorySave",
      } as MemorySaveToolData;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Utility function to safely parse memory retrieve tool result
 */
export function parseMemoryRetrieveResult(result: string): MemoryRetrieveToolData | null {
  try {
    const parsed = JSON.parse(result);

    // Basic validation
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.query === "string" &&
      Array.isArray(parsed.memories) &&
      typeof parsed.totalFound === "number" &&
      typeof parsed.strategy === "string" &&
      typeof parsed.success === "boolean" &&
      typeof parsed.message === "string"
    ) {
      return {
        ...parsed,
        toolName: "memoryRetrieve",
      } as MemoryRetrieveToolData;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generic function to parse tool results with full type safety
 */
export function parseToolResult<K extends keyof ToolDataMap>(
  toolName: K,
  result: string
): ToolDataMap[K] | null {
  const parser = toolResultParsers[toolName];
  return parser ? parser(result) : null;
}

/**
 * Type guard to check if a tool invocation is complete and has a result
 */
export function isCompleteToolInvocation(
  toolInvocation: ToolInvocation
): toolInvocation is ToolInvocation & { state: "result"; result: string } {
  return toolInvocation.state === "result" && typeof toolInvocation.result === "string";
}

/**
 * Type-safe tool invocation handler with full generic support
 */
export function handleToolInvocation<K extends keyof ToolDataMap>(
  toolInvocation: ToolInvocation,
  expectedToolName: K
): ToolDataMap[K] | null {
  if (!isCompleteToolInvocation(toolInvocation)) {
    return null;
  }

  if (toolInvocation.toolName !== expectedToolName) {
    return null;
  }

  return parseToolResult(expectedToolName, toolInvocation.result);
}
