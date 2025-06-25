"use client";

import { deleteMessage, getMessages } from "@/services/chat-messages";
import { convertToAiMessages } from "@/utils/database-message-converter";
import { chatMessagesKeys } from "@/utils/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Message } from "ai";

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

  const deleteMessageMutation = useMutation({
    mutationFn: deleteMessage,
    onMutate: async (messageId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: chatMessagesKeys.byId(sessionId) });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<Message[]>(
        chatMessagesKeys.byId(sessionId)
      );

      // Optimistically update by removing the message
      if (previousMessages) {
        const filteredMessages = previousMessages.filter((msg) => msg.id !== messageId);
        queryClient.setQueryData(chatMessagesKeys.byId(sessionId), filteredMessages);
      }

      // Return a context object with the snapshotted value
      return { previousMessages };
    },
    onError: (err, messageId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData(chatMessagesKeys.byId(sessionId), context.previousMessages);
      }
      console.error("Failed to delete message:", err);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: chatMessagesKeys.byId(sessionId) });
    },
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
    deleteMessage: deleteMessageMutation.mutate,
    isDeletingMessage: deleteMessageMutation.isPending,
    deleteError: deleteMessageMutation.error,
  };
}
