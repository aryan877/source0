"use client";

import { getUsageStats } from "@/services/usage-logs";
import { usageLogsKeys } from "@/utils/query-keys";
import { useQuery } from "@tanstack/react-query";

export interface UsageStatsFilters {
  startDate?: string;
  endDate?: string;
  provider?: string;
  modelId?: string;
}

export function useUsageStats(filters: UsageStatsFilters) {
  return useQuery({
    queryKey: usageLogsKeys.stats(filters),
    queryFn: () => getUsageStats(filters),
    gcTime: 0,
    staleTime: 0,
  });
}
