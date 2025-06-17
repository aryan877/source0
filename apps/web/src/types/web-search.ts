/**
 * Comprehensive types for web search functionality
 * Shared between frontend and backend components
 */

/**
 * Web Search specific types using Tavily API
 */

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
  raw_content?: string;
}

export interface TavilyImage {
  url: string;
  description?: string;
}

export interface TavilyResponse {
  query: string;
  answer?: string;
  images?: TavilyImage[];
  results: TavilySearchResult[];
  response_time: number;
}

export interface WebSearchOptions {
  topic?: "general" | "news";
  search_depth?: "basic" | "advanced";
  max_results?: number;
  time_range?: "day" | "week" | "month" | "year" | "d" | "w" | "m" | "y";
  include_answer?: boolean;
  include_images?: boolean;
  include_raw_content?: boolean;
  country?: string;
}

export interface WebSearchResult {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  images?: TavilyImage[];
  response_time: number;
  error?: string;
}

export interface WebSearchRequest {
  queries: string[];
  options?: WebSearchOptions;
}

/**
 * Frontend-specific types for displaying web search results
 */
export interface WebSearchToolResult {
  searchQuery: string;
  generatedQueries: string[];
  searchResults: WebSearchResult[];
  totalResults: number;
  totalTime: number;
  hasErrors: boolean;
  errors: string[];
}

/**
 * Type for web search tool invocation data
 */
export interface WebSearchToolInvocation {
  state: "result";
  toolName: "webSearch";
  args: {
    query: string;
    options?: WebSearchOptions;
  };
  result: string; // Formatted text result
  searchData?: WebSearchToolResult; // Structured data for UI
}

/**
 * Helper type for parsing web search tool results
 */
export interface ParsedWebSearchResult {
  originalQuery: string;
  generatedQueries: string[];
  results: Array<{
    query: string;
    answer?: string;
    sources: TavilySearchResult[];
    images?: TavilyImage[];
    responseTime: number;
    error?: string;
  }>;
  summary: {
    totalQueries: number;
    totalSources: number;
    totalImages: number;
    totalTime: number;
    hasErrors: boolean;
    errors: string[];
  };
}
