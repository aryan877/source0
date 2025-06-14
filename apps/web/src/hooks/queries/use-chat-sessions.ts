"use client";

import { createClient } from "@/utils/supabase/client";
import { getChatSessions, type ChatSession } from "@/utils/supabase/db";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../useAuth";

// Query keys
export const chatSessionsKeys = {
  all: ["chat-sessions"] as const,
  byUser: (userId: string) => [...chatSessionsKeys.all, "user", userId] as const,
};

// Fetch function using existing db.ts function
async function fetchChatSessions(userId: string): Promise<ChatSession[]> {
  const supabase = createClient();
  return await getChatSessions(supabase, userId);
}

// Delete function
async function deleteChatSession(sessionId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId);

  if (error) {
    throw new Error(`Failed to delete chat session: ${error.message}`);
  }
}

// Main hook
export function useChatSessions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: user?.id ? chatSessionsKeys.byUser(user.id) : [],
    queryFn: () => fetchChatSessions(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds - chat sessions change frequently
    refetchOnWindowFocus: true,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChatSession,
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
