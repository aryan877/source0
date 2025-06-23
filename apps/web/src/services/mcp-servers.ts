import { McpServerFormValues } from "@/lib/validations/mcp-server";
import { Tables } from "@/types/supabase-types";
import { createClient } from "@/utils/supabase/client";

export type McpServer = Tables<"mcp_servers"> & {
  headers: Tables<"mcp_server_headers">[];
};

export async function getMcpServers(): Promise<McpServer[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("mcp_servers")
    .select("*, headers:mcp_server_headers(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching MCP servers:", error);
    throw new Error(error.message);
  }

  return data as McpServer[];
}

export async function createMcpServer(formData: McpServerFormValues): Promise<McpServer> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { name, url, transport, isActive, headers } = formData;

  const { data: serverData, error: serverError } = await supabase
    .from("mcp_servers")
    .insert({ name, url, transport, is_active: isActive, user_id: user.id })
    .select("id")
    .single();

  if (serverError || !serverData) {
    console.error("Error creating MCP server:", serverError);
    throw new Error(serverError?.message || "Failed to create server");
  }

  const serverId = serverData.id;

  if (headers && headers.length > 0) {
    const headerInsertData = headers.map((h) => ({
      server_id: serverId,
      user_id: user.id,
      key: h.key,
      value: h.value,
    }));
    const { error: headersError } = await supabase
      .from("mcp_server_headers")
      .insert(headerInsertData);

    if (headersError) {
      console.error("Error adding MCP server headers:", headersError);
      await supabase.from("mcp_servers").delete().eq("id", serverId);
      throw new Error(headersError.message);
    }
  }

  const { data: newServer, error: fetchError } = await supabase
    .from("mcp_servers")
    .select("*, headers:mcp_server_headers(*)")
    .eq("id", serverId)
    .single();

  if (fetchError || !newServer) {
    console.error("Error fetching new server:", fetchError);
    throw new Error(fetchError?.message || "Failed to fetch new server");
  }

  return newServer as McpServer;
}

export async function updateMcpServer(
  serverId: string,
  formData: McpServerFormValues
): Promise<McpServer> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { name, url, transport, isActive, headers } = formData;

  const { error: serverUpdateError } = await supabase
    .from("mcp_servers")
    .update({ name, url, transport, is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", serverId);

  if (serverUpdateError) {
    console.error("Error updating MCP server:", serverUpdateError);
    throw new Error(serverUpdateError.message);
  }

  const { error: deleteHeadersError } = await supabase
    .from("mcp_server_headers")
    .delete()
    .eq("server_id", serverId);

  if (deleteHeadersError) {
    console.error("Error deleting old headers:", deleteHeadersError);
    throw new Error(deleteHeadersError.message);
  }

  if (headers && headers.length > 0) {
    const headerInsertData = headers.map((h) => ({
      server_id: serverId,
      user_id: user.id,
      key: h.key,
      value: h.value,
    }));

    const { error: insertHeadersError } = await supabase
      .from("mcp_server_headers")
      .insert(headerInsertData);

    if (insertHeadersError) {
      console.error("Error inserting new headers:", insertHeadersError);
      throw new Error(insertHeadersError.message);
    }
  }

  const { data: updatedServer, error: fetchError } = await supabase
    .from("mcp_servers")
    .select("*, headers:mcp_server_headers(*)")
    .eq("id", serverId)
    .single();

  if (fetchError || !updatedServer) {
    console.error("Error fetching updated server:", fetchError);
    throw new Error(fetchError?.message || "Failed to fetch updated server");
  }

  return updatedServer as McpServer;
}

export async function deleteMcpServer(serverId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("mcp_servers").delete().eq("id", serverId);

  if (error) {
    console.error("Error deleting MCP server:", error);
    throw new Error(error.message);
  }
}

export async function duplicateMcpServer(serverId: string): Promise<McpServer> {
  const supabase = createClient();
  const { data: originalServer, error: fetchError } = await supabase
    .from("mcp_servers")
    .select("*, headers:mcp_server_headers(*)")
    .eq("id", serverId)
    .single();

  if (fetchError || !originalServer) {
    console.error("Error fetching server to duplicate:", fetchError);
    throw new Error("Server to duplicate not found");
  }

  const { name, url, transport, isActive, headers } = originalServer;

  const newServerData = {
    name: `${name} (Copy)`,
    url,
    transport,
    isActive,
    headers: headers.map(({ key, value }: { key: string; value: string }) => ({
      key,
      value,
      id: "",
      server_id: "",
      user_id: "",
      created_at: "",
    })),
  };

  return createMcpServer(newServerData as McpServerFormValues);
}
