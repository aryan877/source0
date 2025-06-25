"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";

// // Create persister for localStorage
// const localStoragePersister = createSyncStoragePersister({
//   storage: typeof window !== "undefined" ? window.localStorage : undefined,
//   throttleTime: 1000, // Throttle to save at most every 1 second
// });

// Create QueryClient with appropriate cache settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // gcTime is the time unused queries are garbage collected.
      // We set it to 1 hour instead of the default 5 minutes.
      gcTime: 1000 * 60 * 60 * 1, // 1 hour
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
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
    // <PersistQueryClientProvider
    //   client={queryClient}
    //   persistOptions={{
    //     persister: localStoragePersister,
    //     // The buster string is used to invalidate the cache when making breaking changes.
    //     // Changing this string will cause the client to clear the old cache.
    //     // Version 1: Initial implementation.
    //     // Version 2: Added `is_pinned` to the ChatSession type, which invalidates old cache.
    //     buster: "v2",
    //     maxAge: 1000 * 60 * 60 * 24, // 24 hours
    //     // Only persist chat sessions list, not individual sessions
    //     dehydrateOptions: {
    //       shouldDehydrateQuery: (query) => {
    //         // Only persist the sessions list, not individual sessions
    //         return query.queryKey[0] === "chat-sessions" && query.queryKey[1] === "user";
    //       },
    //     },
    //   }}
    // >
    //   {children}
    //   <ReactQueryDevtools initialIsOpen={false} />
    // </PersistQueryClientProvider>
  );
}
