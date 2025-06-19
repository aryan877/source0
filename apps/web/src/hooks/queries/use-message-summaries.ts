import { getSummariesForSession, type MessageSummary } from "@/services/message-summaries";
import { messageSummariesKeys } from "@/utils/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const useMessageSummaries = (sessionId: string) => {
  const queryClient = useQueryClient();

  const {
    data: summaries,
    isLoading,
    error,
  } = useQuery<MessageSummary[]>({
    queryKey: messageSummariesKeys.bySessionId(sessionId),
    queryFn: () => getSummariesForSession(sessionId),
    enabled: !!sessionId && sessionId !== "new",
    refetchOnWindowFocus: false,
  });

  const invalidateSummaries = () => {
    queryClient.invalidateQueries({ queryKey: messageSummariesKeys.bySessionId(sessionId) });
  };

  return { summaries: summaries ?? [], isLoading, error, invalidateSummaries };
};
