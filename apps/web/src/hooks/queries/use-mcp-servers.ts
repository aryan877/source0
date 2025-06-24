"use client";

import { McpServerFormValues } from "@/lib/validations/mcp-server";
import {
  McpServer,
  createMcpServer,
  deleteMcpServer,
  duplicateMcpServer,
  getMcpServers,
  updateMcpServer,
} from "@/services/mcp-servers";
import { mcpServersKeys } from "@/utils/query-keys";
import { addToast } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useMcpServers() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: mcpServersKeys.all,
    queryFn: getMcpServers,
  });

  const invalidateServers = () => {
    queryClient.invalidateQueries({ queryKey: mcpServersKeys.all });
  };

  const createMutation = useMutation({
    mutationFn: createMcpServer,
    onSuccess: (newServer) => {
      addToast({
        title: "Server Created",
        description: `MCP server "${newServer.name}" has been created successfully.`,
        color: "success",
      });
      invalidateServers();
    },
    onError: (error) => {
      console.error("Failed to create server:", error.message);
      addToast({
        title: "Creation Failed",
        description: `Failed to create MCP server: ${error.message}`,
        color: "danger",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: McpServerFormValues }) =>
      updateMcpServer(id, formData),
    onSuccess: (updatedServer) => {
      addToast({
        title: "Server Updated",
        description: `MCP server "${updatedServer.name}" has been updated successfully.`,
        color: "success",
      });
      invalidateServers();
    },
    onError: (error, { formData }) => {
      console.error("Failed to update server:", error.message);
      addToast({
        title: "Update Failed",
        description: `Failed to update MCP server "${formData.name}": ${error.message}`,
        color: "danger",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => deleteMcpServer(id),
    onSuccess: (_, { name }) => {
      addToast({
        title: "Server Deleted",
        description: `MCP server "${name}" has been deleted.`,
        color: "warning",
      });
      invalidateServers();
    },
    onError: (err, { name }) => {
      console.error(`Failed to delete server ${name}:`, (err as Error).message);
      addToast({
        title: "Deletion Failed",
        description: `Failed to delete MCP server "${name}": ${(err as Error).message}`,
        color: "danger",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateMcpServer,
    onSuccess: (newServer) => {
      addToast({
        title: "Server Duplicated",
        description: `MCP server "${newServer.name}" has been duplicated successfully.`,
        color: "success",
      });
      invalidateServers();
    },
    onError: (error) => {
      console.error("Failed to duplicate server:", error.message);
      addToast({
        title: "Duplication Failed",
        description: `Failed to duplicate MCP server: ${error.message}`,
        color: "danger",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, currentServer }: { id: string; currentServer: McpServer }) => {
      const formData: McpServerFormValues = {
        name: currentServer.name,
        url: currentServer.url,
        transport: currentServer.transport as "http" | "sse",
        isActive: !currentServer.is_active,
        headers: currentServer.headers.map((h) => ({
          id: h.id,
          key: h.key,
          value: h.value,
        })),
      };
      return updateMcpServer(id, formData);
    },
    onSuccess: (updatedServer) => {
      const status = updatedServer.is_active ? "activated" : "deactivated";
      addToast({
        title: "Server Status Changed",
        description: `MCP server "${updatedServer.name}" has been ${status}.`,
        color: updatedServer.is_active ? "success" : "warning",
      });
      invalidateServers();
    },
    onError: (err, variables) => {
      console.error("Failed to update server status:", (err as Error).message);
      addToast({
        title: "Status Update Failed",
        description: `Failed to update server status for "${variables.currentServer.name}": ${
          (err as Error).message
        }`,
        color: "danger",
      });
      invalidateServers();
    },
  });

  return {
    ...query,
    servers: query.data || [],
    invalidateServers,
    createServer: createMutation.mutate,
    isCreatingServer: createMutation.isPending,
    updateServer: updateMutation.mutate,
    isUpdatingServer: updateMutation.isPending,
    updatingServerId: updateMutation.isPending ? updateMutation.variables.id : null,
    deleteServer: deleteMutation.mutate,
    isDeletingServer: deleteMutation.isPending,
    deletingServerId: deleteMutation.isPending ? deleteMutation.variables.id : null,
    duplicateServer: duplicateMutation.mutate,
    isDuplicatingServer: duplicateMutation.isPending,
    duplicatingServerId: duplicateMutation.isPending ? duplicateMutation.variables : null,
    toggleServerActive: toggleActiveMutation.mutate,
    isTogglingServerActive: toggleActiveMutation.isPending,
    togglingServerId: toggleActiveMutation.isPending ? toggleActiveMutation.variables.id : null,
  };
}
