import type { WebSearchToolData } from "@/types/tools";
import type {
  TavilyResponse,
  WebSearchOptions,
  WebSearchRequest,
  WebSearchResult,
} from "@/types/web-search";

/**
 * Generates intelligent search queries from a user's message.
 */
export function generateSearchQueries(userMessage: string): string[] {
  const message = userMessage.trim().toLowerCase();

  // If the message is already a good search query (short and specific), use it as-is
  if (message.length <= 100 && !message.includes("?")) {
    return [userMessage.trim()];
  }

  // For longer messages or questions, extract key concepts
  const queries: string[] = [];

  // Add the main query (cleaned up)
  const mainQuery = userMessage
    .replace(/^(what|how|why|when|where|who|can you|could you|please|tell me|explain)/i, "")
    .replace(/\?+$/, "")
    .trim();

  if (mainQuery) {
    queries.push(mainQuery);
  }

  // For complex queries, add variations
  if (message.includes(" and ") || message.includes(" or ") || message.length > 150) {
    // Extract key phrases and create focused queries
    const keyPhrases = mainQuery.split(/\s+(?:and|or|but|however|also)\s+/i);
    keyPhrases.forEach((phrase) => {
      const cleanPhrase = phrase.trim();
      if (cleanPhrase.length > 10 && cleanPhrase.length < 100) {
        queries.push(cleanPhrase);
      }
    });
  }

  // Limit to 3 queries maximum to avoid overwhelming the API
  return queries.slice(0, 3);
}

/**
 * Performs web search using the Tavily API.
 */
export async function performWebSearch(request: WebSearchRequest): Promise<WebSearchResult[]> {
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

  if (!TAVILY_API_KEY) {
    console.error("TAVILY_API_KEY environment variable is not set");
    return request.queries.map((query) => ({
      query,
      results: [],
      response_time: 0,
      error: "Web search is not configured. Please contact administrator.",
    }));
  }

  const defaultOptions: WebSearchOptions = {
    topic: "general",
    search_depth: "advanced",
    max_results: 5,
    include_answer: true,
    include_images: true,
    include_raw_content: false,
  };

  const options = { ...defaultOptions, ...request.options };

  console.log(`Starting web search for ${request.queries.length} queries...`);

  try {
    const searchPromises = request.queries.map(async (query): Promise<WebSearchResult> => {
      try {
        console.log(`Searching: "${query}"`);

        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TAVILY_API_KEY}`,
          },
          body: JSON.stringify({
            query: query,
            ...options,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = `Search failed: ${response.status} ${response.statusText}`;
          console.error(`Error for query "${query}":`, errorData);

          return {
            query,
            results: [],
            response_time: 0,
            error: errorMessage,
          };
        }

        const data: TavilyResponse = await response.json();

        return {
          query: data.query || query,
          answer: data.answer,
          results: data.results || [],
          images: data.images || [],
          response_time: data.response_time,
        };
      } catch (error) {
        console.error(`Failed to search for "${query}":`, error);
        return {
          query,
          results: [],
          response_time: 0,
          error: error instanceof Error ? error.message : "Unknown search error",
        };
      }
    });

    const results = await Promise.all(searchPromises);

    console.log(`Web search completed. Processed ${results.length} queries.`);
    results.forEach((result, index) => {
      if (result.error) {
        console.log(`Query ${index + 1}: ERROR - ${result.error}`);
      } else {
        console.log(
          `Query ${index + 1}: ${result.results.length} results, ${result.images?.length || 0} images`
        );
      }
    });

    return results;
  } catch (error) {
    console.error("Web search failed:", error);
    return request.queries.map((query) => ({
      query,
      results: [],
      response_time: 0,
      error: error instanceof Error ? error.message : "Web search service unavailable",
    }));
  }
}

/**
 * Creates structured web search data for UI display
 */
export function createWebSearchToolData(
  originalQuery: string,
  generatedQueries: string[],
  searchResults: WebSearchResult[]
): WebSearchToolData {
  const errors: string[] = [];
  let totalResults = 0;

  searchResults.forEach((result) => {
    if (result.error) {
      errors.push(`${result.query}: ${result.error}`);
    } else {
      totalResults += result.results.length;
    }
  });

  return {
    toolName: "webSearch",
    originalQuery,
    generatedQueries,
    searchResults,
    totalResults,
    hasErrors: errors.length > 0,
    errors,
  };
}
