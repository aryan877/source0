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

  const updateSessionInCache = (updatedSession: ChatSession) => {
    if (!user?.id) return;
    queryClient.setQueryData(
      chatSessionsKeys.byUser(user.id),
      (oldData: ChatSession[] | undefined) => {
        if (!oldData) return [updatedSession];

        const newData = oldData.map((session) =>
          session.id === updatedSession.id ? updatedSession : session
        );

        // If the session was not found, add it to the top.
        if (!oldData.some((session) => session.id === updatedSession.id)) {
          newData.unshift(updatedSession);
        }

        // Re-sort by updated_at descending
        newData.sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return dateB - dateA;
        });

        return newData;
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
