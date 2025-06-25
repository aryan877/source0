"use client";

import {
  type ChatSession,
  deleteSession,
  getUserSessions,
  pinSession,
  unpinSession,
} from "@/services/chat-sessions";
import { chatSessionsKeys } from "@/utils/query-keys";
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "../useAuth";

type Page = { data: ChatSession[]; nextCursor: string | null };

export function useChatSessions(searchTerm = "") {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<
    Page,
    Error,
    InfiniteData<Page>,
    readonly (string | undefined)[],
    string | null
  >({
    queryKey: user?.id ? chatSessionsKeys.search(user.id, searchTerm) : [],
    queryFn: ({ pageParam = null }) =>
      getUserSessions(user!.id, {
        cursor: pageParam ?? undefined,
        searchTerm,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const sessions = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data]
  );

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (_, deletedSessionId) => {
      if (user?.id) {
        queryClient.setQueryData(
          chatSessionsKeys.search(user.id, searchTerm),
          (oldData: InfiniteData<Page> | undefined) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                data: page.data.filter((session) => session.id !== deletedSessionId),
              })),
            };
          }
        );
        queryClient.removeQueries({ queryKey: chatSessionsKeys.byId(deletedSessionId) });
      }
    },
    onError: (error) => {
      console.error("Failed to delete chat session:", error);
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: ({ sessionId, isPinned }: { sessionId: string; isPinned: boolean }) =>
      isPinned ? pinSession(sessionId) : unpinSession(sessionId),
    onMutate: async ({ sessionId, isPinned }) => {
      if (!user?.id) return;

      const queryKey = chatSessionsKeys.search(user.id, searchTerm);
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<InfiniteData<Page>>(queryKey);

      queryClient.setQueryData<InfiniteData<Page> | undefined>(queryKey, (oldData) => {
        if (!oldData) return oldData;

        let sessionToMove: ChatSession | undefined;
        const pagesWithoutSession = oldData.pages.map((page) => {
          const session = page.data.find((s) => s.id === sessionId);
          if (session) {
            sessionToMove = session;
            return {
              ...page,
              data: page.data.filter((s) => s.id !== sessionId),
            };
          }
          return page;
        });

        if (sessionToMove) {
          const updatedSession = { ...sessionToMove, is_pinned: isPinned };

          const newPages = [...pagesWithoutSession];
          const firstPage = newPages[0] ?? { data: [], nextCursor: null };
          newPages[0] = {
            ...firstPage,
            data: [updatedSession, ...firstPage.data],
          };

          return {
            ...oldData,
            pages: newPages,
          };
        }

        return oldData;
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData && user?.id) {
        queryClient.setQueryData(
          chatSessionsKeys.search(user.id, searchTerm),
          context.previousData
        );
      }
      console.error("Failed to toggle pin status:", err);
    },
    onSettled: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: chatSessionsKeys.byUser(user.id) });
      }
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

    queryClient.setQueryData(
      chatSessionsKeys.search(targetUserId, searchTerm),
      (oldData: InfiniteData<Page> | undefined) => {
        if (!oldData) return oldData;

        const sessionWithDate = {
          ...updatedSession,
          updated_at: updatedSession.updated_at || new Date().toISOString(),
        };

        let sessionExists = false;
        const newPages = oldData.pages.map((page) => {
          const existingIndex = page.data.findIndex((s) => s.id === updatedSession.id);
          if (existingIndex !== -1) {
            sessionExists = true;
            const newData = [...page.data];
            newData[existingIndex] = { ...newData[existingIndex], ...sessionWithDate };
            return { ...page, data: newData };
          }
          return page;
        });

        if (sessionExists) {
          return { ...oldData, pages: newPages };
        }
        // If the session is new, add it to the top of the first page.
        const firstPage = oldData.pages[0] || { data: [] };
        const newFirstPage = {
          ...firstPage,
          data: [sessionWithDate, ...firstPage.data].sort((a, b) => {
            const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return dateB - dateA;
          }),
        };
        return {
          ...oldData,
          pages: [newFirstPage, ...oldData.pages.slice(1)],
        };
      }
    );
  };

  return {
    ...query,
    sessions,
    deleteSession: deleteMutation.mutate,
    isDeletingSession: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    togglePinSession: togglePinMutation.mutate,
    isTogglingPin: togglePinMutation.isPending,
    invalidateSessions,
    updateSessionInCache,
  };
}
