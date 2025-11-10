"use client";

import { getUsageLogs } from "@/services/client/usage-logs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export const usageLogsKeys = {
  all: ["usageLogs"] as const,
  lists: () => [...usageLogsKeys.all, "list"] as const,
  list: (filters: object) => [...usageLogsKeys.lists(), filters] as const,
  stats: (filters: object) => [...usageLogsKeys.all, "stats", filters] as const,
};

export interface UsageLogsFilters {
  startDate?: string;
  endDate?: string;
  provider?: string;
  modelId?: string;
  pageSize?: number;
}

export function useUsageLogs(filters: UsageLogsFilters) {
  const {
    data,
    error,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: usageLogsKeys.list(filters),
    queryFn: ({ pageParam }) => getUsageLogs({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    gcTime: 0,
    staleTime: 0,
  });

  const usageLogs = useMemo(() => data?.pages.flatMap((page) => page.data) || [], [data]);

  return {
    usageLogs,
    error,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
    refetch,
  };
}
