"use client";

import { getUsageLogs } from "@/services/usage-logs";
import { usageLogsKeys } from "@/utils/query-keys";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

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
    queryFn: ({ pageParam: cursor }) => getUsageLogs({ ...filters, cursor }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
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
