import { type McpServer } from "@/services/mcp-servers.server";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { experimental_createMCPClient as createMCPClient, type Tool } from "ai";

// Utility to generate safe identifiers for client connections
const generateClientId = (name: string): string => {
  return `s0-chat-${name.trim().toLowerCase().replace(/[^\w]/g, "-").replace(/-+/g, "-")}`;
};

// Helper to build request headers from server configuration
const buildRequestHeaders = (
  headerConfig?: Array<{ key: string; value: string }>
): Record<string, string> => {
  if (!headerConfig) return {};

  return headerConfig.reduce(
    (result, { key, value }) => {
      if (key?.trim()) {
        result[key] = value || "";
      }
      return result;
    },
    {} as Record<string, string>
  );
};

// Creates transport layer based on server configuration
const setupTransportLayer = (server: McpServer, requestHeaders: Record<string, string>) => {
  if (server.transport === "sse") {
    return {
      type: "sse" as const,
      url: server.url,
      headers: requestHeaders,
    };
  }

  return new StreamableHTTPClientTransport(new URL(server.url), {
    requestInit: { headers: requestHeaders },
  });
};

// Process individual server and extract its available tools
const processServerConnection = async (server: McpServer): Promise<Record<string, Tool>> => {
  const toolRegistry: Record<string, Tool> = {};

  if (!server.is_active) {
    return toolRegistry;
  }

  console.log(`Connecting to server ${server.name} via ${server.transport}`);

  try {
    const requestHeaders = buildRequestHeaders(server.headers);
    const transportLayer = setupTransportLayer(server, requestHeaders);

    const connection = await createMCPClient({
      transport: transportLayer,
      name: generateClientId(server.name),
    });

    const availableTools = await connection.tools();
    const toolIdentifiers = Object.keys(availableTools);

    if (toolIdentifiers.length === 0) {
      console.log(`Server ${server.name} provides no tools`);
      return toolRegistry;
    }

    console.log(`Server ${server.name} provides ${toolIdentifiers.length} tools`);

    // Register each tool with a unique namespace
    Object.entries(availableTools).forEach(([identifier, toolDef]) => {
      const namespacedId = `mcp_${server.name.replace(/\W+/g, "_")}_${identifier}`;
      toolRegistry[namespacedId] = toolDef;
    });

    console.log(`Integrated ${Object.keys(toolRegistry).length} tools from ${server.name}`);
  } catch (connectionError) {
    const errorInfo =
      connectionError instanceof Error
        ? { message: connectionError.message, stack: connectionError.stack }
        : { message: String(connectionError) };

    console.error(`Connection failed for ${server.name}:`, errorInfo);
  }

  return toolRegistry;
};

// Main orchestrator function for tool discovery across all servers
export async function discoverMcpTools(serverList: McpServer[]): Promise<Record<string, Tool>> {
  if (!serverList?.length) {
    return {};
  }

  console.log(`Starting tool discovery across ${serverList.length} servers`);

  const serverProcessors = serverList.map(processServerConnection);
  const toolRegistries = await Promise.allSettled(serverProcessors);

  const consolidatedTools: Record<string, Tool> = {};

  toolRegistries.forEach((result, index) => {
    if (result.status === "fulfilled") {
      Object.assign(consolidatedTools, result.value);
    } else {
      console.error(`Failed to process server ${serverList[index]?.name}:`, result.reason);
    }
  });

  const discoveredCount = Object.keys(consolidatedTools).length;
  console.log(`Tool discovery completed - ${discoveredCount} tools now available`);

  return consolidatedTools;
}
