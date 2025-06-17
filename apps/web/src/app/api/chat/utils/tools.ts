import { type ModelCapability } from "@/config/models";
import { tool } from "ai";
import { z } from "zod";
import { createWebSearchToolData, generateSearchQueries, performWebSearch } from "./web-search";

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

CRITICAL: When using search results in your response, you MUST include inline citations using square brackets with numbers like [1], [2], [3].

Citation Rules:
1. Place citations [1], [2] etc. immediately after the sentence or phrase that uses information from that source
2. Use the exact citation number that corresponds to the search result order
3. Multiple citations can be grouped like [1,2] or [1, 2, 3]
4. Every factual claim from search results MUST have a citation
5. Do not make up citation numbers - only use numbers that correspond to actual search results

Example format:
"The event occurred on June 15th [1] and resulted in significant policy changes [2, 3]. According to recent reports [1], the impact was substantial."

The search results will be numbered sequentially starting from [1] for you to reference.`,

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

    // Create structured data for UI and build formatted sources for the model
    const toolData = createWebSearchToolData(query, queries, searchResults);

    // Create a formatted response for the AI model with numbered sources
    const formattedSources = [];
    let sourceNumber = 1;

    for (const result of searchResults) {
      if (!result.error && result.results) {
        for (const source of result.results) {
          formattedSources.push(
            `[${sourceNumber}] ${source.title}\n${source.content}\nSource: ${source.url}`
          );
          sourceNumber++;
        }
      }
    }

    const formattedResponse = {
      query: query,
      sources: formattedSources,
      instruction:
        "Use the numbered sources above in your response. Cite them using the format [1], [2], etc. immediately after statements that reference those sources.",
    };

    console.log(`Web search completed for: "${query}" with ${formattedSources.length} sources`);

    // Return both the formatted response for the AI and the tool data for the UI
    return JSON.stringify({
      ...toolData,
      formatted_response: formattedResponse,
    });
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
