"use client";

import { createClient } from "@/utils/supabase/client";
import { convertToAiMessages, getMessages, type ChatMessage } from "@/utils/supabase/db";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Message } from "ai";

// Query keys
export const chatMessagesKeys = {
  all: ["chat-messages"] as const,
  bySession: (sessionId: string) => [...chatMessagesKeys.all, "session", sessionId] as const,
};

// Fetch function
async function fetchChatMessages(sessionId: string): Promise<{
  dbMessages: ChatMessage[];
  aiMessages: Message[];
}> {
  const supabase = createClient();
  const dbMessages = await getMessages(supabase, sessionId);
  const aiMessages = convertToAiMessages(dbMessages);

  return { dbMessages, aiMessages };
}

// Main hook
export function useChatMessages(sessionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: sessionId && sessionId !== "new" ? chatMessagesKeys.bySession(sessionId) : [],
    queryFn: () => fetchChatMessages(sessionId),
    enabled: !!sessionId && sessionId !== "new",
    staleTime: 1 * 60 * 1000, // 1 minute - messages are relatively static once sent
    refetchOnWindowFocus: false, // Don't refetch messages on focus
  });

  const invalidateMessages = () => {
    if (sessionId && sessionId !== "new") {
      queryClient.invalidateQueries({
        queryKey: chatMessagesKeys.bySession(sessionId),
      });
    }
  };

  const addOptimisticMessage = (message: Message) => {
    if (sessionId && sessionId !== "new") {
      queryClient.setQueryData(
        chatMessagesKeys.bySession(sessionId),
        (oldData: { dbMessages: ChatMessage[]; aiMessages: Message[] } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            aiMessages: [...oldData.aiMessages, message],
          };
        }
      );
    }
  };

  return {
    ...query,
    messages: query.data?.aiMessages || [],
    dbMessages: query.data?.dbMessages || [],
    invalidateMessages,
    addOptimisticMessage,
  };
}
