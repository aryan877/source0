"use client";

import {
  ChatSession,
  deleteSession,
  getUserSessions,
  searchUserSessions,
} from "@/services/chat-sessions";
import { chatSessionsKeys } from "@/utils/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../useAuth";

// Main hook - now clean and simple with built-in persistence
export function useChatSessions(searchTerm = "") {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: user?.id ? chatSessionsKeys.search(user.id, searchTerm) : [],
    queryFn: () => (searchTerm ? searchUserSessions(searchTerm) : getUserSessions(user!.id)),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (_, deletedSessionId) => {
      // Optimistically update all session lists for the user
      if (user?.id) {
        queryClient.setQueriesData(
          {
            queryKey: chatSessionsKeys.byUser(user.id),
            exact: false,
          },
          (oldData: ChatSession[] | undefined): ChatSession[] => {
            if (!oldData) return [];
            return oldData.filter((session) => session.id !== deletedSessionId);
          }
        );

        // Remove the individual session from cache
        queryClient.removeQueries({ queryKey: chatSessionsKeys.byId(deletedSessionId) });
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
    const targetUserId = userId || user?.id;
    if (!targetUserId) {
      console.error("Cannot update session cache: no user ID available");
      return;
    }

    queryClient.setQueriesData(
      { queryKey: chatSessionsKeys.byUser(targetUserId) },
      (oldData: ChatSession[] | undefined): ChatSession[] => {
        const sessionWithDate = {
          ...updatedSession,
          updated_at: updatedSession.updated_at || new Date().toISOString(),
        };

        if (!oldData) {
          return [sessionWithDate];
        }

        const existingIndex = oldData.findIndex((session) => session.id === updatedSession.id);
        let newData: ChatSession[];

        if (existingIndex !== -1) {
          // Update existing session
          newData = oldData.map((session, index) =>
            index === existingIndex ? { ...session, ...sessionWithDate } : session
          );
        } else {
          // Add new session
          newData = [sessionWithDate, ...oldData];
        }

        // Sort by updated_at descending
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
