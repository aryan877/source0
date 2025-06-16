"use client";

import { deleteSession, getUserSessions, type ChatSession } from "@/services/chat-sessions";
import { chatSessionsKeys } from "@/utils/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../useAuth";

// Main hook
export function useChatSessions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: user?.id ? chatSessionsKeys.byUser(user.id) : [],
    queryFn: () => getUserSessions(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds - chat sessions change frequently
    refetchOnWindowFocus: true,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (_, sessionId) => {
      // Remove the deleted session from cache
      if (user?.id) {
        queryClient.setQueryData(
          chatSessionsKeys.byUser(user.id),
          (oldData: ChatSession[] | undefined) =>
            oldData?.filter((session) => session.id !== sessionId) || []
        );
      }
    },
    onError: (error) => {
      console.error("Failed to delete chat session:", error);
    },
  });

  const invalidateSessions = () => {
    if (user?.id) {
      queryClient.invalidateQueries({
        queryKey: chatSessionsKeys.byUser(user.id),
      });
    }
  };

  const updateSessionInCache = (updatedSession: ChatSession, userId?: string) => {
    // Use provided userId or fall back to current user
    const targetUserId = userId || user?.id;

    if (!targetUserId) {
      console.error("Cannot update session cache: no user ID available");
      return;
    }

    queryClient.setQueryData(
      chatSessionsKeys.byUser(targetUserId),
      (oldData: ChatSession[] | undefined): ChatSession[] => {
        // If no existing data, return array with just the updated session
        if (!oldData) {
          return [
            {
              ...updatedSession,
              updated_at: updatedSession.updated_at || new Date().toISOString(),
            },
          ];
        }

        // Find existing session index
        const existingIndex = oldData.findIndex((session) => session.id === updatedSession.id);

        let newData: ChatSession[];

        if (existingIndex >= 0) {
          // Update existing session immutably
          newData = oldData.map((session, index) =>
            index === existingIndex
              ? {
                  ...session,
                  ...updatedSession,
                  updated_at: updatedSession.updated_at || new Date().toISOString(),
                }
              : session
          );
        } else {
          // Add new session to the beginning
          newData = [
            {
              ...updatedSession,
              updated_at: updatedSession.updated_at || new Date().toISOString(),
            },
            ...oldData,
          ];
        }

        // Sort by updated_at descending (most recent first)
        return newData.sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return dateB - dateA;
        });
      }
    );
  };

  return {
    ...query,
    sessions: query.data || [],
    deleteSession: deleteMutation.mutate,
    isDeletingSession: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    invalidateSessions,
    updateSessionInCache,
  };
}
