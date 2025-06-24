import { type Database } from "@/types/supabase-types";
import { createClient } from "@/utils/supabase/client";

export type ModelUsageLog = Database["public"]["Tables"]["model_usage_logs"]["Row"];

export interface UsageLogsFilters {
  startDate?: string;
  endDate?: string;
  provider?: string;
  modelId?: string;
  pageSize?: number;
}

export async function getUsageLogs(filters: UsageLogsFilters & { cursor?: string } = {}) {
  const supabase = createClient();
  const { pageSize = 20, cursor, startDate, endDate, provider, modelId } = filters;

  let query = supabase
    .from("model_usage_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(pageSize);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  if (endDate) {
    const endDate = new Date(filters.endDate!);
    endDate.setDate(endDate.getDate() + 1);
    query = query.lt("created_at", endDate.toISOString());
  }

  if (provider) {
    query = query.eq("provider", provider);
  }

  if (modelId) {
    query = query.eq("model_id", modelId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching usage logs:", error);
    throw error;
  }

  const nextCursor = data && data.length === pageSize ? data[data.length - 1]?.created_at : null;

  return {
    data: data || [],
    nextCursor,
  };
}

export async function getUsageStats(filters: Omit<UsageLogsFilters, "pageSize"> = {}) {
  const supabase = createClient();
  const { startDate, endDate, provider, modelId } = filters;

  const { data, error } = await supabase.rpc("get_usage_stats", {
    start_date_filter: startDate,
    end_date_filter: endDate,
    provider_filter: provider,
    model_id_filter: modelId,
  });

  if (error) {
    console.error("Error fetching usage stats via RPC:", error);
    throw error;
  }

  const stats = data?.[0];

  return {
    total_requests: stats?.total_requests ?? 0,
    total_tokens: stats?.total_tokens ?? 0,
    total_prompt_tokens: stats?.total_prompt_tokens ?? 0,
    total_completion_tokens: stats?.total_completion_tokens ?? 0,
  };
}
