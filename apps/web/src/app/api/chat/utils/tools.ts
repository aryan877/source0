import { type ModelCapability } from "@/config/models";
import { tool, type Tool } from "ai";
import { z } from "zod";
import { retrieveMemory, saveMemory } from "./memory";
import { createWebSearchToolData, generateSearchQueries, performWebSearch } from "./web-search";

/**
 * Web search tool that allows the AI to search the internet for current information.
 * The AI can use this tool when it needs up-to-date information or when the user
 * asks questions about recent events, current data, or specific facts.
 *
 * The tool automatically generates 2-3 intelligent queries based on the complexity
 * and context of the user's request for comprehensive results.
 */
export const webSearchTool = tool({
  description: `Search the web for current information.
This tool returns a JSON object with search results. You must use these results to answer the user's request.
In your response, you MUST use inline citations for every piece of information you use from the search results.
The 'searchResults' array in the JSON contains the results. Each result in the 'results' array within it is a source.
Cite sources sequentially using [1], [2], [3], etc. The first source is [1], the second is [2], and so on.
Example response: "The first search result says that X is Y [1]. The second result adds that... [2]."`,

  parameters: z.object({
    query: z
      .string()
      .describe(
        "The main search query or question. The tool will automatically generate additional intelligent queries if needed for comprehensive results."
      ),
    options: z
      .object({
        topic: z
          .enum(["general", "news"])
          .optional()
          .describe(
            "Type of search - 'news' for current events/breaking news, 'general' for broader searches. Tool auto-selects based on query."
          ),
        search_depth: z
          .enum(["basic", "advanced"])
          .optional()
          .describe(
            "Search depth - 'advanced' provides more relevant content snippets and better analysis, 'basic' for quick results. Defaults to 'advanced'."
          ),
        max_results: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .describe(
            "Maximum number of results per query (1-10). Tool may generate multiple queries automatically."
          ),
        time_range: z
          .enum(["day", "week", "month", "year"])
          .optional()
          .describe("Time range for filtering results - use for time-sensitive searches"),
        include_domains: z
          .array(z.string())
          .optional()
          .describe("Specific domains to include (e.g., ['wikipedia.org', 'reuters.com'])"),
        exclude_domains: z.array(z.string()).optional().describe("Domains to exclude from results"),
        include_images: z.boolean().optional().describe("Include relevant images in results"),
        enable_detailed_analysis: z
          .boolean()
          .optional()
          .describe("Enable detailed content extraction for in-depth analysis requests"),
      })
      .optional()
      .describe("Advanced search configuration options"),
  }),

  execute: async ({ query, options = {} }) => {
    console.log(`AI requesting enhanced web search for: "${query}"`);

    // Generate intelligent search queries from the user's question
    const queries = generateSearchQueries(query);
    console.log(`Generated ${queries.length} intelligent queries: ${queries.join(", ")}`);

    // Build enhanced search options
    const searchOptions = {
      topic: options.topic || "general",
      search_depth: options.search_depth || "advanced", // Default to advanced for better results
      max_results: options.max_results || 5,
      include_answer: true,
      include_images: options.include_images || false,
      include_raw_content: options.enable_detailed_analysis || false,
      include_image_descriptions: options.include_images || false,
      chunks_per_source: 3, // For advanced search depth
      include_domains: options.include_domains || [],
      exclude_domains: options.exclude_domains || [],
      ...(options.time_range && { time_range: options.time_range }),
    };

    // Perform the enhanced search
    const searchResults = await performWebSearch({
      queries,
      options: searchOptions,
    });

    // Create structured data for UI and model
    const toolData = createWebSearchToolData(query, queries, searchResults);

    console.log(
      `Web search completed for: "${query}" with ${toolData.totalResults} total sources across ${queries.length} queries`
    );

    // Return the structured data. Both the UI and the model will use this.
    // The model is instructed via the description on how to parse this and create citations.
    return toolData;
  },
});

/**
 * Memory save tool that intelligently saves important user information for future conversations.
 * The AI should use this tool when users share personal information, preferences, or important details
 * that would be valuable to remember for providing personalized responses in future interactions.
 */
const memorySaveParameters = z.object({
  content: z
    .string()
    .describe("The important information to save as memory. Should be clear and specific."),
  userId: z.string().describe("Unique identifier for the user whose memory this belongs to"),
  sessionId: z
    .string()
    .optional()
    .describe("Optional session identifier for grouping related memories"),
  metadata: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe("Optional additional metadata to store with the memory"),
});

export const memorySaveToolDefinition = {
  description: `Save important user information for personalized future interactions. Use when users share personal info, preferences, goals, constraints, or important context. Don't save generic responses or temporary information.`,

  parameters: memorySaveParameters,

  execute: async ({
    content,
    userId,
    sessionId,
    metadata = {},
  }: z.infer<typeof memorySaveParameters>) => {
    console.log(`AI saving memory for user: ${userId}`);
    console.log(`Content: ${content}`);

    // Validate that we have a user ID
    if (!userId || userId.trim() === "") {
      return JSON.stringify({
        toolName: "memorySave",
        memoryId: "",
        content,
        metadata,
        userId: "",
        sessionId,
        success: false,
        message: "❌ Cannot save memory: User ID is required but not provided.",
      });
    }

    // Create messages array for mem0
    const messages = [
      {
        role: "user" as const,
        content: content,
      },
    ];

    // Save the memory
    const result = await saveMemory({
      messages,
      userId,
      sessionId,
      metadata: {
        ...metadata,
        importance: "high",
      },
    });

    console.log(`Memory save result:`, result);
    return JSON.stringify(result);
  },
};
export const memorySaveTool = tool(memorySaveToolDefinition);

/**
 * Memory retrieve tool that searches for relevant user memories to provide personalized responses.
 * The AI should use this tool when it needs context about the user to provide better, more personalized answers.
 */
const memoryRetrieveParameters = z.object({
  query: z
    .string()
    .describe(
      "Search query to find relevant memories. Should describe what kind of information you're looking for."
    ),
  userId: z.string().describe("Unique identifier for the user whose memories to search"),
  limit: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .describe("Maximum number of memories to retrieve (default: 5)"),
  sessionId: z
    .string()
    .optional()
    .describe("Optional session identifier to search within specific session"),
});
export const memoryRetrieveToolDefinition = {
  description: `Retrieve relevant user memories to provide personalized responses. Use when you need context about user preferences, background, or past conversations for better recommendations and advice.`,

  parameters: memoryRetrieveParameters,

  execute: async ({
    query,
    userId,
    limit = 5,
    sessionId,
  }: z.infer<typeof memoryRetrieveParameters>) => {
    console.log(`AI retrieving memories for user: ${userId}`);
    console.log(`Query: ${query}`);

    // Validate that we have a user ID
    if (!userId || userId.trim() === "") {
      return JSON.stringify({
        toolName: "memoryRetrieve",
        query,
        memories: [],
        totalFound: 0,
        strategy: "error",
        success: false,
        message: "❌ Cannot retrieve memories: User ID is required but not provided.",
      });
    }

    // Retrieve memories
    const result = await retrieveMemory({
      query,
      userId,
      limit,
      sessionId,
      threshold: 0.1, // Lower threshold for more inclusive results
    });

    console.log(`Memory retrieval result:`, result);
    return JSON.stringify(result);
  },
};
export const memoryRetrieveTool = tool(memoryRetrieveToolDefinition);

/**
 * Collection of all available tools
 */
export const availableTools = {
  webSearch: webSearchTool,
  memorySave: memorySaveTool,
  memoryRetrieve: memoryRetrieveTool,
};

/**
 * Get tools based on model capabilities and user settings
 */
export function getToolsForModel(
  userId: string,
  searchEnabled: boolean,
  memoryEnabled: boolean = true,
  modelConfig?: { capabilities: ModelCapability[] }
) {
  const tools: Record<string, Tool> = {};

  // Only add web search tool if:
  // 1. Search is enabled by user
  // 2. Model doesn't already have built-in search capabilities
  const shouldAddWebSearch = searchEnabled && !modelConfig?.capabilities.includes("search");

  if (shouldAddWebSearch) {
    tools.webSearch = webSearchTool;
  }

  if (memoryEnabled) {
    // For memorySave, we create a new tool that doesn't ask the model for userId
    tools.memorySave = tool({
      description: memorySaveToolDefinition.description,
      parameters: memorySaveToolDefinition.parameters.omit({ userId: true }),
      execute: async (args) => {
        // We inject the userId here before calling the original execute function
        return memorySaveToolDefinition.execute({ ...args, userId });
      },
    });

    // Do the same for memoryRetrieve
    tools.memoryRetrieve = tool({
      description: memoryRetrieveToolDefinition.description,
      parameters: memoryRetrieveToolDefinition.parameters.omit({ userId: true }),
      execute: async (args) => {
        return memoryRetrieveToolDefinition.execute({ ...args, userId });
      },
    });
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
