import { getSession } from "@/services/client/chat-sessions";
import { useQuery } from "@tanstack/react-query";
import { chatSessionsKeys } from "./use-chat-sessions";

export function useChatSession(sessionId: string) {
  return useQuery({
    queryKey: chatSessionsKeys.byId(sessionId),
    queryFn: () => getSession(sessionId),
    enabled: !!sessionId && sessionId !== "new",
  });
}
