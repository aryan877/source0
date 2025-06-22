"use client";

import { getMessages } from "@/services/chat-messages";
import { convertToAiMessages } from "@/utils/message-utils";
import { chatMessagesKeys } from "@/utils/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Main hook
export function useChatMessages(sessionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: chatMessagesKeys.byId(sessionId),
    queryFn: async () => {
      const dbMessages = await getMessages(sessionId);
      return convertToAiMessages(dbMessages);
    },
    enabled: !!sessionId && sessionId !== "new",
    staleTime: 0, // Refetch on mount
    refetchOnWindowFocus: true,
  });

  const invalidateMessages = () => {
    queryClient.invalidateQueries({
      queryKey: chatMessagesKeys.byId(sessionId),
    });
  };

  return {
    ...query,
    messages: query.data || [],
    invalidateMessages,
  };
}
