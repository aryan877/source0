"use client";

import { getModelById } from "@/config/models";
import { useChatMessages } from "@/hooks/queries/use-chat-messages";
import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatHandlers } from "@/hooks/use-chat-handlers";
import { useChatState } from "@/hooks/use-chat-state";
import { useScrollManagement } from "@/hooks/use-scroll-management";
import { useAuth } from "@/hooks/useAuth";
import {
  createSession,
  deleteFromPoint,
  getLatestStreamIdWithStatus,
  markStreamAsCancelled,
  saveAssistantMessage,
} from "@/services";
import { type ChatSession } from "@/services/chat-sessions";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { prepareMessageForDb } from "@/utils/message-utils";
import { useChat, type Message } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatInput, type ChatInputRef } from "./chat-input";
import { MessagesList } from "./messages-list";

interface ChatWindowProps {
  chatId: string;
}

const ChatWindow = memo(({ chatId }: ChatWindowProps) => {
  const { state, updateState, selectedModel, reasoningLevel, setReasoningLevel } =
    useChatState(chatId);
  const { transferModelSelection } = useModelSelectorStore();
  const { user } = useAuth();
  const router = useRouter();

  const {
    messages: queryMessages,
    isLoading: isLoadingMessages,
    invalidateMessages,
  } = useChatMessages(chatId);
  const { updateSessionInCache } = useChatSessions();

  const messagesToUse = useMemo(() => {
    return chatId !== "new" ? queryMessages : [];
  }, [chatId, queryMessages]);

  const { messagesContainerRef, showScrollToBottom, isAtBottomRef, scrollToBottom, handleScroll } =
    useScrollManagement();

  const { handleFileAttach, handleRemoveFile, handleBranchChat, handleModelChange } =
    useChatHandlers(
      chatId,
      state,
      updateState,
      updateSessionInCache,
      transferModelSelection,
      router,
      user
    );

  const {
    messages,
    input,
    setInput,
    status,
    stop,
    error,
    append,
    setMessages,
    data,
    experimental_resume,
  } = useChat({
    api: "/api/chat",
    id: chatId === "new" ? undefined : chatId,
    initialMessages: messagesToUse,
    sendExtraMessageFields: true,
    generateId: () => uuidv4(),
    experimental_throttle: 100,
    body: {
      model: selectedModel,
      reasoningLevel: reasoningLevel,
      searchEnabled: state.searchEnabled,
      id: chatId === "new" ? undefined : chatId,
      isFirstMessage: chatId !== "new" && messagesToUse.length === 0,
    },
    onError: (error) => {
      console.error("useChat Hook Error", error, {
        chatId,
        selectedModel: selectedModel,
        reasoningLevel: reasoningLevel,
        searchEnabled: state.searchEnabled,
        messageCount: messages.length,
        status,
        input: input?.substring(0, 100),
        attachedFilesCount: state.attachedFiles.length,
      });
    },
    onResponse: (response) => {
      if (!response.ok) {
        console.error(
          "API Response Error",
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          {
            chatId,
            selectedModel: selectedModel,
            status: response.status,
            statusText: response.statusText,
            url: response.url,
          }
        );
      }
    },
    onFinish: async (message, { usage, finishReason }) => {
      console.log("onFinish", message, { usage, finishReason });
      if (process.env.NODE_ENV === "development") {
        console.log("Chat stream finished", {
          chatId,
          selectedModel: selectedModel,
          messageId: message.id,
          finishReason,
          usage,
          timestamp: new Date().toISOString(),
        });
      }

      // Handle the new comprehensive message_complete annotation
      const messageCompleteAnnotation = message.annotations?.find(
        (a) =>
          typeof a === "object" &&
          a !== null &&
          !Array.isArray(a) &&
          (a as { type?: unknown }).type === "message_complete"
      );

      let hasGrounding = false; // Default value

      if (messageCompleteAnnotation) {
        const data = (messageCompleteAnnotation as { data?: unknown }).data;
        if (typeof data === "object" && data !== null) {
          const annotationData = data as {
            databaseId?: string;
            messageSaved?: boolean;
            titleGenerated?: string;
            userId?: string;
            hasGrounding?: boolean;
          };

          hasGrounding = annotationData.hasGrounding ?? false; // Update from annotation

          console.log("Processing message_complete annotation:", {
            originalId: message.id,
            databaseId: annotationData.databaseId,
            messageSaved: annotationData.messageSaved,
            hasTitle: !!annotationData.titleGenerated,
            hasGrounding: annotationData.hasGrounding,
            annotationCount: message.annotations?.length || 0,
          });

          // Update message ID if it was saved successfully
          if (annotationData.messageSaved && annotationData.databaseId) {
            const databaseId = annotationData.databaseId;
            setMessages((currentMessages) =>
              currentMessages.map((msg) =>
                msg.id === message.id ? { ...msg, id: databaseId } : msg
              )
            );
          }

          // Handle title update if generated
          if (annotationData.titleGenerated && annotationData.userId && chatId !== "new") {
            const sessionUpdate: ChatSession = {
              id: chatId,
              title: annotationData.titleGenerated,
              updated_at: new Date().toISOString(),
            } as ChatSession;

            updateSessionInCache(sessionUpdate, annotationData.userId);
          }
        }
      } else {
        console.log("No message_complete annotation found:", {
          messageId: message.id,
          annotationCount: message.annotations?.length || 0,
          annotationTypes:
            message.annotations?.map((a) =>
              typeof a === "object" && a !== null && !Array.isArray(a)
                ? (a as { type?: unknown }).type
                : "unknown"
            ) || [],
        });
      }

      // Always invalidate messages to get fresh data
      // Use longer delay for messages with grounding to ensure all DB operations complete
      if (chatId && chatId !== "new") {
        const delay = hasGrounding ? 200 : 100;
        console.log(
          `Scheduling invalidateMessages with ${delay}ms delay (hasGrounding: ${hasGrounding})`
        );

        setTimeout(() => {
          invalidateMessages();
        }, delay);
      }
    },
  });

  /**
   * Handles stopping the current streaming chat response.
   *
   * This function performs three main operations:
   * 1. Immediately stops the streaming response
   * 2. Saves any partial assistant message content to the database
   * 3. Marks the stream as cancelled to prevent resumption
   *
   * All operations after stopping are fire-and-forget to ensure UI responsiveness.
   */
  const handleStop = useCallback(() => {
    // Stop the stream first - this is synchronous and immediate
    stop();

    // Process saving and stream cancellation in parallel (fire-and-forget)
    const lastAssistantMessage = messages.filter((m) => m.role === "assistant").at(-1);

    // Save partial message (non-blocking)
    if (lastAssistantMessage && chatId !== "new" && user) {
      console.log("Saving partial message due to user stop:", lastAssistantMessage);

      // Get the model config to extract the proper provider
      const modelConfig = getModelById(selectedModel);
      const modelProvider = modelConfig?.provider || "Unknown";

      // Use the helper function to properly convert message parts
      const preparedMessage = prepareMessageForDb({
        message: lastAssistantMessage,
        sessionId: chatId,
        userId: user.id,
        model: selectedModel,
        modelProvider,
        reasoningLevel: reasoningLevel,
        searchEnabled: state.searchEnabled,
      });

      // Save the partial message if we have content (fire-and-forget)
      if (preparedMessage.parts.length > 0) {
        saveAssistantMessage(
          lastAssistantMessage,
          chatId,
          user.id,
          selectedModel,
          modelProvider,
          { reasoningLevel: reasoningLevel, searchEnabled: state.searchEnabled },
          { fireAndForget: true, existingParts: preparedMessage.parts }
        );
      }
    }

    // Cancel stream (fire-and-forget)
    if (chatId && chatId !== "new") {
      getLatestStreamIdWithStatus(chatId)
        .then((latestStream) => {
          if (latestStream && !latestStream.cancelled) {
            console.log(`Marking stream ${latestStream.streamId} as cancelled`);
            return markStreamAsCancelled(latestStream.streamId);
          }
        })
        .catch((error) => {
          console.error("Error marking stream as cancelled:", error);
        });
    }
  }, [stop, chatId, messages, user, selectedModel, reasoningLevel, state.searchEnabled]);

  /**
   * Retries the last failed chat request.
   *
   * This function finds the most recent user message and re-sends it.
   * Used when there's a network error or other failure during message processing.
   * Only user messages can be retried - assistant messages cannot be regenerated this way.
   */
  const handleRetryFailedRequest = useCallback(async () => {
    const lastUserMessage = messages.filter((m) => m.role === "user").at(-1);

    if (!lastUserMessage) {
      console.error("No user message found to retry.");
      updateState({ uiError: "Could not find a message to retry." });
      return;
    }

    try {
      updateState({ uiError: null });
      stop();

      // Simply re-send the last user message
      await append(lastUserMessage);
    } catch (error) {
      console.error("Error during request retry:", error);
      updateState({
        uiError: "Failed to retry request. Please try again.",
      });
    }
  }, [messages, stop, updateState, append]);

  useAutoResume({
    autoResume: chatId !== "new",
    initialMessages: messagesToUse,
    experimental_resume,
    data,
    setMessages,
    messagesLoading: isLoadingMessages,
    chatId: chatId !== "new" ? chatId : undefined,
  });

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [messagesContainerRef, handleScroll]);

  useLayoutEffect(() => {
    if (messagesContainerRef.current) {
      // If the user was at the bottom before the new message, scroll to the new bottom.
      // Otherwise, do nothing, preserving their scroll position.
      if (isAtBottomRef.current) {
        scrollToBottom("instant");
      }
    }
  }, [messages, messagesContainerRef, isAtBottomRef, scrollToBottom]);

  // Handle pending first message from sessionStorage for new sessions
  useEffect(() => {
    if (chatId === "new") return;

    const pendingMessageData = sessionStorage.getItem("pendingFirstMessage");
    if (!pendingMessageData) return;

    try {
      const { message, chatRequestOptions, reasoningLevel, searchEnabled } =
        JSON.parse(pendingMessageData);

      // Clear the pending message
      sessionStorage.removeItem("pendingFirstMessage");

      // Restore the state that was saved when creating the session
      if (reasoningLevel !== undefined) {
        setReasoningLevel(reasoningLevel);
      }
      if (searchEnabled !== undefined) {
        updateState({ searchEnabled });
      }

      // Submit the pending message with the isFirstMessage flag
      append(message, chatRequestOptions);
      setInput("");
      updateState({ attachedFiles: [] });
      setTimeout(() => chatInputRef.current?.focus(), 0);
    } catch (error) {
      console.error("Failed to process pending message:", error);
      sessionStorage.removeItem("pendingFirstMessage");
    }
  }, [chatId, append, setInput, updateState, setReasoningLevel]);

  const isLoading = status === "submitted" || status === "streaming";

  /**
   * Retries a specific message by its ID.
   *
   * This function:
   * 1. Finds the message to retry in the conversation
   * 2. If it's a user message, retries that message directly
   * 3. If it's an assistant message, finds the previous user message and retries that
   * 4. Deletes the target message and all subsequent messages from the database
   * 5. Removes them from the local state
   * 6. Re-sends the user message
   *
   * This provides consistent retry behavior regardless of which message is clicked.
   */
  const handleRetryMessage = useCallback(
    async (messageId: string) => {
      try {
        updateState({ uiError: null });
        stop(); // Stop any ongoing requests first

        const clickedMessageIndex = messages.findIndex((m) => m.id === messageId);
        if (clickedMessageIndex === -1) {
          console.error("Retry failed: message not found", { messageId });
          updateState({ uiError: "Message to retry not found." });
          return;
        }

        const clickedMessage = messages[clickedMessageIndex];
        if (!clickedMessage) {
          console.error("Retry failed: message object not found", { messageId });
          updateState({ uiError: "Message to retry not found." });
          return;
        }

        let userMessageToRetry: Message;
        let retryFromIndex: number;

        if (clickedMessage.role === "user") {
          // If clicking on a user message, retry that message
          userMessageToRetry = clickedMessage;
          retryFromIndex = clickedMessageIndex;
        } else {
          // If clicking on an assistant message, find the previous user message
          let userMessageIndex = -1;
          for (let i = clickedMessageIndex - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg && msg.role === "user") {
              userMessageIndex = i;
              break;
            }
          }

          if (userMessageIndex === -1) {
            updateState({ uiError: "No user message found to retry." });
            return;
          }

          const foundUserMessage = messages[userMessageIndex];
          if (!foundUserMessage) {
            updateState({ uiError: "User message not found to retry." });
            return;
          }

          userMessageToRetry = foundUserMessage;
          retryFromIndex = userMessageIndex;
        }

        if (chatId && chatId !== "new") {
          await deleteFromPoint(userMessageToRetry.id);
          invalidateMessages();
        }

        // Remove the user message and everything after it
        setMessages((currentMessages) => currentMessages.slice(0, retryFromIndex));

        append(userMessageToRetry);
      } catch (error) {
        console.error("Error during message retry:", error);
        updateState({
          uiError: "Failed to retry message. Please try again.",
        });
        if (chatId && chatId !== "new") {
          setTimeout(() => invalidateMessages(), 500);
        }
      }
    },
    [messages, stop, chatId, updateState, invalidateMessages, setMessages, append]
  );

  /**
   * Creates a new chat session and handles the first message.
   *
   * This function:
   * 1. Creates a new session in the database
   * 2. Stores the pending message in sessionStorage (to survive navigation)
   * 3. Navigates to the new session URL
   * 4. The message will be automatically sent when the new page loads
   *
   * This pattern ensures the session exists before sending the first message,
   * which is required for proper database relationships.
   */
  const handleCreateNewSession = useCallback(
    async (
      message: Message,
      chatRequestOptions?: Parameters<typeof append>[1] & { isFirstMessage?: boolean }
    ) => {
      if (!user) {
        updateState({ uiError: "Please log in to start a chat." });
        return;
      }

      try {
        const messageData = {
          message,
          chatRequestOptions: {
            ...chatRequestOptions,
            isFirstMessage: true,
          },
          selectedModel,
          reasoningLevel: reasoningLevel,
          searchEnabled: state.searchEnabled,
        };
        sessionStorage.setItem("pendingFirstMessage", JSON.stringify(messageData));

        const newSession = await createSession(user.id, "New Chat");
        updateSessionInCache(newSession, user.id);
        transferModelSelection("new", newSession.id);
        router.push(`/chat/${newSession.id}`);
      } catch (error) {
        console.error("Failed to create new session:", error);
        updateState({ uiError: "Failed to create new chat. Please try again." });
      }
    },
    [
      user,
      updateState,
      selectedModel,
      reasoningLevel,
      state.searchEnabled,
      updateSessionInCache,
      transferModelSelection,
      router,
    ]
  );

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      updateState({ uiError: null });

      if (!input.trim() && state.attachedFiles.length === 0) {
        return;
      }

      const stillUploading = state.attachedFiles.some((file) => file.uploading);
      if (stillUploading) {
        updateState({ uiError: "Please wait for files to finish uploading." });
        return;
      }

      const failedFiles = state.attachedFiles.filter((file) => file.error);
      if (failedFiles.length > 0) {
        updateState({
          uiError: "Some files failed to upload. Please remove them or try again.",
        });
        return;
      }

      const validAttachedFiles = state.attachedFiles.filter((file) => file.uploadResult);
      const attachments = validAttachedFiles.map((file) => ({
        name: file.uploadResult!.name,
        contentType: file.uploadResult!.contentType,
        url: file.uploadResult!.url,
        path: file.uploadResult!.path,
        size: file.uploadResult!.size,
      }));

      const textPart = input.trim() ? [{ type: "text" as const, text: input.trim() }] : [];
      const fileParts = attachments.map((att) => ({
        type: "file" as const,
        mimeType: att.contentType,
        url: att.url,
        filename: att.name,
        path: att.path,
      }));

      const messageToAppend = {
        role: "user" as const,
        content: input.trim(),
        parts: [...textPart, ...fileParts] as Message["parts"],
      } as Message;

      const chatRequestOptions =
        attachments.length > 0
          ? {
              experimental_attachments: attachments,
            }
          : undefined;

      if (chatId === "new") {
        await handleCreateNewSession(messageToAppend, chatRequestOptions);
        return;
      }

      append(messageToAppend, chatRequestOptions);
      // Force scroll to bottom after user submits a message
      setTimeout(() => scrollToBottom("smooth"), 100);
      setInput("");
      updateState({ attachedFiles: [] });
      setTimeout(() => chatInputRef.current?.focus(), 0);
    },
    [
      append,
      state.attachedFiles,
      input,
      setInput,
      updateState,
      chatId,
      handleCreateNewSession,
      scrollToBottom,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleFormSubmit(e as React.FormEvent);
      }
    },
    [handleFormSubmit]
  );

  const canSubmit = useMemo(
    () => (input.trim().length > 0 || state.attachedFiles.length > 0) && !isLoading,
    [input, state.attachedFiles.length, isLoading]
  );

  const chatInputRef = useRef<ChatInputRef | null>(null);

  return (
    <div className="flex h-full flex-col">
      <MessagesList
        messages={messages}
        isLoading={isLoading}
        isLoadingMessages={isLoadingMessages}
        chatId={chatId}
        onBranchChat={handleBranchChat}
        onRetryMessage={handleRetryMessage}
        messagesContainerRef={messagesContainerRef}
        error={error}
        uiError={state.uiError}
        onDismissUiError={() => updateState({ uiError: null })}
        onRetry={handleRetryFailedRequest}
      />

      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        canSubmit={canSubmit}
        attachedFiles={state.attachedFiles}
        selectedModel={selectedModel}
        reasoningLevel={reasoningLevel}
        searchEnabled={state.searchEnabled}
        showScrollToBottom={showScrollToBottom}
        chatId={chatId}
        onSubmit={handleFormSubmit}
        onKeyDown={handleKeyDown}
        onModelChange={handleModelChange}
        onReasoningLevelChange={setReasoningLevel}
        onSearchToggle={(enabled) => updateState({ searchEnabled: enabled })}
        onFileAttach={handleFileAttach}
        onRemoveFile={handleRemoveFile}
        onScrollToBottom={() => scrollToBottom("smooth")}
        onStop={handleStop}
        onClearUiError={() => updateState({ uiError: null })}
        ref={chatInputRef}
      />
    </div>
  );
});

ChatWindow.displayName = "ChatWindow";

export default ChatWindow;
