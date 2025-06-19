/**
 * Memory management utilities using Mem0 API
 * Handles saving and retrieving user memories for personalized AI interactions
 */

import type { MemoryRetrieveToolData, MemorySaveToolData } from "@/types/tools";

// =============================================================================
// Types
// =============================================================================

export interface MemoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SaveMemoryRequest {
  messages: MemoryMessage[];
  userId: string;
  sessionId?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface RetrieveMemoryRequest {
  query: string;
  userId: string;
  sessionId?: string;
  limit?: number;
  threshold?: number;
}

export interface MemoryResult {
  id: string;
  memory: string;
  category: string;
  metadata: Record<string, string | number | boolean>;
  score: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Memory Operations
// =============================================================================

/**
 * Saves memories using the Mem0 API
 */
export async function saveMemory(request: SaveMemoryRequest): Promise<MemorySaveToolData> {
  const { messages, userId, sessionId, metadata = {} } = request;

  try {
    // Check if MEM0_API_KEY is available
    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) {
      throw new Error("MEM0_API_KEY environment variable is not set");
    }

    // Prepare the request payload according to Mem0 API docs
    const payload = {
      messages,
      user_id: userId,
      ...(sessionId && { run_id: sessionId }),
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        importance: "high",
      },
    };

    // Make API call to Mem0 v1 endpoint (save still uses v1)
    const response = await fetch("https://api.mem0.ai/v1/memories/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mem0 API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Extract memory ID from response (Mem0 returns an array of memory operations)
    const memoryId = result[0]?.id || "unknown";
    const content = result[0]?.data?.memory || messages.map((m) => m.content).join(" ");

    return {
      toolName: "memorySave",
      memoryId,
      content,
      metadata: payload.metadata,
      userId,
      sessionId,
      success: true,
      message: `💾 Memory saved successfully! Stored important information about the user for future conversations.`,
    };
  } catch (error) {
    console.error("Error saving memory:", error);

    return {
      toolName: "memorySave",
      memoryId: "",
      content: messages.map((m) => m.content).join(" "),
      metadata,
      userId,
      sessionId,
      success: false,
      message: `❌ Failed to save memory: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Retrieves memories using the Mem0 API
 */
export async function retrieveMemory(
  request: RetrieveMemoryRequest
): Promise<MemoryRetrieveToolData> {
  const { query, userId, sessionId, limit = 5, threshold = 0.1 } = request;

  try {
    // Check if MEM0_API_KEY is available
    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) {
      throw new Error("MEM0_API_KEY environment variable is not set");
    }

    // Prepare search payload using v2 API with proper filters structure
    const filters: Record<string, unknown> = {
      AND: [{ user_id: userId }, ...(sessionId ? [{ run_id: sessionId }] : [])],
    };

    const payload = {
      query,
      filters,
      limit,
      threshold,
    };

    // Make API call to Mem0 v2 search endpoint
    const response = await fetch("https://api.mem0.ai/v2/memories/search/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mem0 API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`Retrieved ${result?.length || 0} memories for query: "${query}"`);

    // Transform results to our format - v2 API returns array directly
    const memories = (result || []).map(
      (item: {
        id: string;
        memory: string;
        metadata: Record<string, string | number | boolean>;
        score?: number;
        created_at: string;
        updated_at: string;
      }) => ({
        id: item.id,
        content: item.memory,
        category: (item.metadata?.category as string) || "general",
        metadata: item.metadata || {},
        relevanceScore: item.score || 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })
    );

    const strategy =
      memories.length > 0
        ? `Found ${memories.length} relevant memories using semantic search`
        : "No relevant memories found for this query";

    return {
      toolName: "memoryRetrieve",
      query,
      memories,
      totalFound: memories.length,
      strategy,
      success: true,
      message:
        memories.length > 0
          ? `🧠 Retrieved ${memories.length} relevant memories that can help provide personalized responses.`
          : `🔍 No relevant memories found for this query. This might be a new topic for this user.`,
    };
  } catch (error) {
    console.error("Error retrieving memories:", error);

    return {
      toolName: "memoryRetrieve",
      query,
      memories: [],
      totalFound: 0,
      strategy: "error",
      success: false,
      message: `❌ Failed to retrieve memories: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
