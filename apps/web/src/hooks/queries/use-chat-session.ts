import { getSession } from "@/services/chat-sessions";
import { chatSessionsKeys } from "@/utils/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useChatSession(sessionId: string) {
  return useQuery({
    queryKey: chatSessionsKeys.byId(sessionId),
    queryFn: () => getSession(sessionId),
    enabled: !!sessionId && sessionId !== "new",
  });
}
