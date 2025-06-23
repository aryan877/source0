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
      queryClient.setQueryData(mcpServersKeys.all, (oldData: McpServer[] = []) => [
        ...oldData,
        newServer,
      ]);
      addToast({
        title: "Server Created",
        description: `MCP server "${newServer.name}" has been created successfully.`,
        color: "success",
      });
    },
    onError: (error) => {
      console.error("Failed to create server:", error.message);
      addToast({
        title: "Creation Failed",
        description: `Failed to create MCP server: ${error.message}`,
        color: "danger",
      });
      invalidateServers();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: McpServerFormValues }) =>
      updateMcpServer(id, formData),
    onSuccess: (updatedServer) => {
      queryClient.setQueryData(mcpServersKeys.all, (oldData: McpServer[] = []) =>
        oldData.map((s) => (s.id === updatedServer.id ? updatedServer : s))
      );
      addToast({
        title: "Server Updated",
        description: `MCP server "${updatedServer.name}" has been updated successfully.`,
        color: "success",
      });
    },
    onError: (error) => {
      console.error("Failed to update server:", error.message);
      addToast({
        title: "Update Failed",
        description: `Failed to update MCP server: ${error.message}`,
        color: "danger",
      });
      invalidateServers();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMcpServer,
    onMutate: async (deletedServerId) => {
      await queryClient.cancelQueries({ queryKey: mcpServersKeys.all });
      const previousServers = queryClient.getQueryData<McpServer[]>(mcpServersKeys.all);
      queryClient.setQueryData<McpServer[]>(mcpServersKeys.all, (old = []) =>
        old.filter((s) => s.id !== deletedServerId)
      );
      return { previousServers };
    },
    onSuccess: (_, deletedServerId, context) => {
      const deletedServer = context?.previousServers?.find((s) => s.id === deletedServerId);
      addToast({
        title: "Server Deleted",
        description: `MCP server "${deletedServer?.name || "Unknown"}" has been deleted.`,
        color: "warning",
      });
    },
    onError: (err, variables, context) => {
      console.error("Failed to delete server:", (err as Error).message);
      addToast({
        title: "Deletion Failed",
        description: `Failed to delete MCP server: ${(err as Error).message}`,
        color: "danger",
      });
      if (context?.previousServers) {
        queryClient.setQueryData(mcpServersKeys.all, context.previousServers);
      } else {
        invalidateServers();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: mcpServersKeys.all });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateMcpServer,
    onSuccess: (newServer) => {
      queryClient.setQueryData(mcpServersKeys.all, (oldData: McpServer[] = []) => [
        ...oldData,
        newServer,
      ]);
      addToast({
        title: "Server Duplicated",
        description: `MCP server "${newServer.name}" has been duplicated successfully.`,
        color: "success",
      });
    },
    onError: (error) => {
      console.error("Failed to duplicate server:", error.message);
      addToast({
        title: "Duplication Failed",
        description: `Failed to duplicate MCP server: ${error.message}`,
        color: "danger",
      });
      invalidateServers();
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
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: mcpServersKeys.all });
      const previousServers = queryClient.getQueryData<McpServer[]>(mcpServersKeys.all);
      queryClient.setQueryData<McpServer[]>(mcpServersKeys.all, (old = []) =>
        old.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s))
      );
      return { previousServers };
    },
    onSuccess: (updatedServer) => {
      const status = updatedServer.is_active ? "activated" : "deactivated";
      addToast({
        title: "Server Status Changed",
        description: `MCP server "${updatedServer.name}" has been ${status}.`,
        color: updatedServer.is_active ? "success" : "warning",
      });
    },
    onError: (err, variables, context) => {
      console.error("Failed to update server status:", (err as Error).message);
      addToast({
        title: "Status Update Failed",
        description: `Failed to update server status: ${(err as Error).message}`,
        color: "danger",
      });
      if (context?.previousServers) {
        queryClient.setQueryData(mcpServersKeys.all, context.previousServers);
      } else {
        invalidateServers();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: mcpServersKeys.all });
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
    deleteServer: deleteMutation.mutate,
    isDeletingServer: deleteMutation.isPending,
    duplicateServer: duplicateMutation.mutate,
    isDuplicatingServer: duplicateMutation.isPending,
    toggleServerActive: toggleActiveMutation.mutate,
    isTogglingServerActive: toggleActiveMutation.isPending,
  };
}
