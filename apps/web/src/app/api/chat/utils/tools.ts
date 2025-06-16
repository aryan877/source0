import { type ModelCapability } from "@/config/models";
import { tool } from "ai";
import { z } from "zod";
import { generateSearchQueries, performWebSearch } from "./web-search";

/**
 * Web search tool that allows the AI to search the internet for current information.
 * The AI can use this tool when it needs up-to-date information or when the user
 * asks questions about recent events, current data, or specific facts.
 */
export const webSearchTool = tool({
  description: `Search the web for current information, news, and facts. Use this tool when you need:
- Current events or recent news
- Up-to-date information that might not be in your training data
- Specific facts, statistics, or data
- Recent developments in any field
- Real-time information

The tool will automatically generate appropriate search queries based on the user's question.`,

  parameters: z.object({
    query: z.string().describe("The search query or question to search for"),
    options: z
      .object({
        topic: z
          .enum(["general", "news"])
          .optional()
          .describe("Type of search - 'news' for current events, 'general' for broader searches"),
        max_results: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .describe("Maximum number of results per query (1-10)"),
        time_range: z
          .enum(["day", "week", "month", "year"])
          .optional()
          .describe("Time range for news searches"),
      })
      .optional()
      .describe("Optional search configuration"),
  }),

  execute: async ({ query, options = {} }) => {
    try {
      console.log(`AI requesting web search for: "${query}"`);

      // Generate intelligent search queries from the user's question
      const queries = generateSearchQueries(query);
      console.log(`Generated queries: ${queries.join(", ")}`);

      // Perform the search
      const searchResults = await performWebSearch({
        queries,
        options: {
          topic: options.topic || "general",
          search_depth: "advanced",
          max_results: options.max_results || 5,
          include_answer: true,
          include_images: false,
          ...(options.time_range && { time_range: options.time_range }),
        },
      });

      // Format results for the AI
      let formattedResults = `Web Search Results for: "${query}"\n\n`;

      searchResults.forEach((result, index) => {
        if (result.error) {
          formattedResults += `Query ${index + 1}: "${result.query}" - ERROR: ${result.error}\n\n`;
          return;
        }

        formattedResults += `Query ${index + 1}: "${result.query}"\n`;

        if (result.answer) {
          formattedResults += `AI Summary: ${result.answer}\n\n`;
        }

        if (result.results.length > 0) {
          formattedResults += "Sources:\n";
          result.results.forEach((source, idx) => {
            formattedResults += `${idx + 1}. ${source.title}\n`;
            formattedResults += `   URL: ${source.url}\n`;
            if (source.published_date) {
              formattedResults += `   Date: ${source.published_date}\n`;
            }
            formattedResults += `   Content: ${source.content.substring(0, 300)}...\n\n`;
          });
        }

        formattedResults += "---\n\n";
      });

      console.log(`Web search completed successfully for: "${query}"`);
      return formattedResults;
    } catch (error) {
      console.error("Web search tool error:", error);
      return `Web search failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
});

/**
 * Collection of all available tools
 */
export const availableTools = {
  webSearch: webSearchTool,
};

/**
 * Get tools based on model capabilities and user settings
 */
export function getToolsForModel(
  searchEnabled: boolean,
  modelConfig?: { capabilities: ModelCapability[] }
) {
  const tools: Record<string, typeof webSearchTool> = {};

  // Only add web search tool if:
  // 1. Search is enabled by user
  // 2. Model doesn't already have built-in search capabilities
  const shouldAddWebSearch = searchEnabled && !modelConfig?.capabilities.includes("search");

  if (shouldAddWebSearch) {
    tools.webSearch = webSearchTool;
  }

  // Future tools can be added here with their own logic
  // Example:
  // if (codeExecutionEnabled) {
  //   tools.codeExecution = codeExecutionTool;
  // }
  // if (imageGenerationEnabled && !modelConfig?.capabilities.includes("image-generation")) {
  //   tools.imageGeneration = imageGenerationTool;
  // }

  return tools;
}
