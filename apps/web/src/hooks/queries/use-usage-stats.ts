"use client";

import { getUsageStats } from "@/services/client/usage-logs";
import { useQuery } from "@tanstack/react-query";
import { usageLogsKeys } from "./use-usage-logs";

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
