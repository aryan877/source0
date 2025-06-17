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

// =============================================================================
// Generic Tool System
// =============================================================================

/**
 * Union type of all possible tool data types
 */
export type ToolDataUnion = WebSearchToolData;

/**
 * Generic tool result parser function type
 */
export type ToolResultParser<T extends BaseToolData = BaseToolData> = (result: string) => T | null;

/**
 * Mapping of tool names to their data types
 */
export interface ToolDataMap {
  webSearch: WebSearchToolData;
}

/**
 * Type-safe tool result parsers registry
 */
export const toolResultParsers: {
  [K in keyof ToolDataMap]: ToolResultParser<ToolDataMap[K]>;
} = {
  webSearch: parseWebSearchResult,
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
