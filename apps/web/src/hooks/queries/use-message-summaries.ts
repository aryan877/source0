import { getSummariesForSession, type MessageSummary } from "@/services/client/message-summaries";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const messageSummariesKeys = {
  all: ["message-summaries"] as const,
  bySessionId: (sessionId: string) => [...messageSummariesKeys.all, "session", sessionId] as const,
};

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
