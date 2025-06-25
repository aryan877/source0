"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";

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
  );
}
