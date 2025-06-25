"use client";

import {
  type ChatSession,
  deleteSession,
  getNewUserSessions,
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
import { useCallback, useEffect, useMemo } from "react";
import { useAuth } from "../useAuth";

type Page = { data: ChatSession[]; nextCursor: string | null };

export function useChatSessions(searchTerm = "") {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => (user?.id ? chatSessionsKeys.search(user.id, searchTerm) : []),
    [user?.id, searchTerm]
  );

  const invalidateSessions = useCallback(() => {
    if (user?.id) {
      queryClient.invalidateQueries({
        queryKey: chatSessionsKeys.byUser(user.id),
      });
    }
  }, [user?.id, queryClient]);

  const query = useInfiniteQuery<
    Page,
    Error,
    InfiniteData<Page>,
    readonly (string | undefined)[],
    string | null
  >({
    queryKey,
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

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible" || !user?.id || searchTerm) {
        return;
      }

      const latestSession = query.data?.pages[0]?.data[0];
      if (!latestSession?.updated_at) {
        // If there are no sessions, or the latest has no timestamp,
        // a simple invalidation is safer to refetch the initial list.
        invalidateSessions();
        return;
      }

      try {
        const newSessions = await getNewUserSessions(user.id, latestSession.updated_at);

        if (newSessions.length > 0) {
          queryClient.setQueryData(queryKey, (oldData: InfiniteData<Page> | undefined) => {
            if (!oldData) return oldData;

            // Filter out any sessions that might already be in the list
            const existingIds = new Set(oldData.pages.flatMap((p) => p.data.map((s) => s.id)));
            const trulyNewSessions = newSessions.filter((s) => !existingIds.has(s.id));

            if (trulyNewSessions.length === 0) {
              return oldData;
            }

            // Prepend the new sessions to the first page
            const newPages = [...oldData.pages];
            const firstPage = newPages[0] ?? { data: [], nextCursor: null };

            const updatedFirstPage = {
              ...firstPage,
              data: [...trulyNewSessions, ...firstPage.data],
            };

            newPages[0] = updatedFirstPage;

            return {
              ...oldData,
              pages: newPages,
            };
          });
        }
      } catch (error) {
        console.error("Failed to fetch new sessions on focus:", error);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [query.data, user?.id, searchTerm, queryClient, invalidateSessions, queryKey]);

  const sessions = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data]
  );

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (_, deletedSessionId) => {
      if (user?.id) {
        queryClient.setQueryData(queryKey, (oldData: InfiniteData<Page> | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.filter((session) => session.id !== deletedSessionId),
            })),
          };
        });
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
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      console.error("Failed to toggle pin status:", err);
    },
    onSettled: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: chatSessionsKeys.byUser(user.id) });
      }
    },
  });

  const updateSessionInCache = useCallback(
    (updatedSession: ChatSession, userId?: string) => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) {
        console.error("Cannot update session cache: no user ID available");
        return;
      }

      const keyToUpdate =
        targetUserId === user?.id ? queryKey : chatSessionsKeys.search(targetUserId, searchTerm);

      queryClient.setQueryData(keyToUpdate, (oldData: InfiniteData<Page> | undefined) => {
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
      });
    },
    [user?.id, queryClient, searchTerm, queryKey]
  );

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
