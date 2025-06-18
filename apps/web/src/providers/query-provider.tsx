"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import React from "react";

// Create persister for localStorage
const localStoragePersister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  throttleTime: 1000, // Throttle to save at most every 1 second
});

// Create QueryClient with appropriate cache settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 24 hours to work well with persistence
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

interface Props {
  children: React.ReactNode;
}

export function QueryProvider({ children }: Props) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: localStoragePersister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        // Only persist chat sessions list, not individual sessions
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist the sessions list, not individual sessions
            return query.queryKey[0] === "chat-sessions" && query.queryKey[1] === "user";
          },
        },
      }}
    >
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  );
}
