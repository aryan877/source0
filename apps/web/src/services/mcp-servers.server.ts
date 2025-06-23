import { type Tables } from "@/types/supabase-types";
import { createClient } from "@/utils/supabase/server";

export type McpServer = Tables<"mcp_servers"> & {
  headers: Tables<"mcp_server_headers">[];
};

/**
 * Fetches the active MCP servers for a given user from the server-side.
 * @param userId - The ID of the user.
 * @returns A promise that resolves to an array of active McpServer objects.
 */
export async function getActiveMcpServersForUser(userId: string): Promise<McpServer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mcp_servers")
    .select("*, headers:mcp_server_headers(*)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching active MCP servers:", error);
    throw new Error(`Failed to fetch active MCP servers: ${error.message}`);
  }

  return data as McpServer[];
}
