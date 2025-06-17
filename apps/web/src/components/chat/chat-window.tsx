"use client";

import { getModelById } from "@/config/models";
import { useChatMessages } from "@/hooks/queries/use-chat-messages";
import { useChatSession } from "@/hooks/queries/use-chat-session";
import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatHandlers } from "@/hooks/use-chat-handlers";
import { useChatState } from "@/hooks/use-chat-state";
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
import { Chip } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatInput, type ChatInputRef } from "./chat-input";
import { MessagesList } from "./messages-list";
import { SamplePrompts } from "./sample-prompts";
import { ShareButton } from "./share-button";

interface ChatWindowProps {
  chatId: string;
  isSharedView?: boolean;
}

const ChatWindow = memo(({ chatId, isSharedView = false }: ChatWindowProps) => {
  const {
    state,
    updateState,
    selectedModel,
    reasoningLevel,
    setReasoningLevel,
    searchEnabled,
    setSearchEnabled,
  } = useChatState(chatId);
  const { transferModelSelection } = useModelSelectorStore();
  const { user } = useAuth();
  const router = useRouter();
  const justSubmittedMessageId = useRef<string | null>(null);

  const {
    messages: queryMessages,
    isLoading: isLoadingMessages,
    invalidateMessages,
  } = useChatMessages(chatId);
  const { updateSessionInCache, invalidateSessions } = useChatSessions();

  const messagesToUse = useMemo(() => {
    return chatId !== "new" ? queryMessages : [];
  }, [chatId, queryMessages]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
      searchEnabled: searchEnabled,
      id: chatId === "new" ? undefined : chatId,
      isFirstMessage: chatId !== "new" && messagesToUse.length === 0,
    },
    onError: (error) => {
      console.error("useChat Hook Error", error, {
        chatId,
        selectedModel: selectedModel,
        reasoningLevel: reasoningLevel,
        searchEnabled: searchEnabled,
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

      // Reset bottom padding to normal when AI finishes responding
      if (messagesContainerRef.current) {
        const messagesContainer = messagesContainerRef.current.querySelector(".mx-auto.max-w-3xl");
        if (messagesContainer) {
          const messagesContainerElement = messagesContainer as HTMLElement;
          const originalPadding = messagesContainerElement.dataset.originalPadding || "2rem";
          messagesContainerElement.style.paddingBottom = originalPadding;
        }
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

  const handleDismissUiError = useCallback(() => {
    updateState({ uiError: null });
  }, [updateState]);

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
        searchEnabled: searchEnabled,
      });

      // Save the partial message if we have content (fire-and-forget)
      if (preparedMessage.parts.length > 0) {
        saveAssistantMessage(
          lastAssistantMessage,
          chatId,
          user.id,
          selectedModel,
          modelProvider,
          { reasoningLevel: reasoningLevel, searchEnabled: searchEnabled },
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
  }, [stop, chatId, messages, user, selectedModel, reasoningLevel, searchEnabled]);

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

  // Scroll user message to top when a new user message is added
  useLayoutEffect(() => {
    if (!justSubmittedMessageId.current || messages.length === 0) return;

    const messageElement = document.querySelector(
      `[data-message-id="${justSubmittedMessageId.current}"]`
    ) as HTMLElement;

    const container = messagesContainerRef.current;
    if (!messageElement || !container) {
      justSubmittedMessageId.current = null;
      return;
    }

    const messagesContainer = container.querySelector(".mx-auto.max-w-3xl") as HTMLElement;
    if (!messagesContainer) {
      justSubmittedMessageId.current = null;
      return;
    }

    // Calculate and apply padding synchronously
    const containerHeight = container.clientHeight;
    const neededPadding = Math.max(containerHeight - 100, 200);
    messagesContainer.style.paddingBottom = `${neededPadding}px`;
    messagesContainer.dataset.originalPadding = "2rem";

    // Use requestAnimationFrame for smooth scroll after layout
    requestAnimationFrame(() => {
      const messageOffsetTop = messageElement.offsetTop;
      const targetScrollTop = messageOffsetTop - 80;

      container.scrollTo({
        top: targetScrollTop,
        behavior: "smooth",
      });

      console.log("Scrolled user message to top:", {
        messageId: justSubmittedMessageId.current,
        messageOffsetTop,
        targetScrollTop,
      });
    });

    justSubmittedMessageId.current = null;
  }, [messages]);

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
        setSearchEnabled(searchEnabled);
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
  }, [chatId, append, setInput, updateState, setReasoningLevel, setSearchEnabled]);

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
          searchEnabled: searchEnabled,
        };
        sessionStorage.setItem("pendingFirstMessage", JSON.stringify(messageData));

        const newSession = await createSession(user.id, "New Chat");
        invalidateSessions();
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
      searchEnabled,
      invalidateSessions,
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
        id: uuidv4(),
        role: "user" as const,
        content: input.trim(),
        parts: [...textPart, ...fileParts] as Message["parts"],
      } as Message;

      // Store the message ID for scroll tracking
      justSubmittedMessageId.current = messageToAppend.id;

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

      // Set the message ID for height tracking
      justSubmittedMessageId.current = messageToAppend.id;

      append(messageToAppend, chatRequestOptions);

      setInput("");
      updateState({ attachedFiles: [] });
      setTimeout(() => chatInputRef.current?.focus(), 0);
    },
    [append, state.attachedFiles, input, setInput, updateState, chatId, handleCreateNewSession]
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

  const handlePromptSelect = useCallback(
    (prompt: string) => {
      setInput(prompt);
      setTimeout(() => chatInputRef.current?.focus(), 0);
    },
    [setInput]
  );

  const canSubmit = useMemo(
    () => (input.trim().length > 0 || state.attachedFiles.length > 0) && !isLoading,
    [input, state.attachedFiles.length, isLoading]
  );

  const chatInputRef = useRef<ChatInputRef | null>(null);

  // Get session data for the share button using React Query
  const { data: sessionData } = useChatSession(chatId);

  // Show sample prompts when there are no messages and no input
  const showSamplePrompts =
    messages.length === 0 && !input.trim() && state.attachedFiles.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header with share button */}
      {chatId !== "new" && sessionData && (
        <div className="flex items-center justify-between bg-background/60 px-4 py-3 backdrop-blur-sm">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {isSharedView && (
                <Chip
                  size="sm"
                  variant="flat"
                  color="primary"
                  startContent={
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                  }
                >
                  Shared
                </Chip>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isSharedView && <ShareButton session={sessionData} />}
          </div>
        </div>
      )}

      {showSamplePrompts ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <SamplePrompts
            onPromptSelect={handlePromptSelect}
            className=""
            userName={user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there"}
          />
        </div>
      ) : (
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
          onDismissUiError={handleDismissUiError}
          onRetry={handleRetryFailedRequest}
        />
      )}

      {/* Only show chat input for non-shared views */}
      {!isSharedView && (
        <ChatInput
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          canSubmit={canSubmit}
          attachedFiles={state.attachedFiles}
          selectedModel={selectedModel}
          reasoningLevel={reasoningLevel}
          searchEnabled={searchEnabled}
          chatId={chatId}
          onSubmit={handleFormSubmit}
          onKeyDown={handleKeyDown}
          onModelChange={handleModelChange}
          onReasoningLevelChange={setReasoningLevel}
          onSearchToggle={setSearchEnabled}
          onFileAttach={handleFileAttach}
          onRemoveFile={handleRemoveFile}
          onStop={handleStop}
          onClearUiError={() => updateState({ uiError: null })}
          onPromptSelect={handlePromptSelect}
          ref={chatInputRef}
        />
      )}

      {/* Alternative footer for shared views */}
      {isSharedView && (
        <div className="border-t border-divider bg-content1/50 px-4 py-4">
          <div className="flex items-center justify-center gap-4 text-sm text-default-600">
            <span>Want to start your own conversation?</span>
            <Link
              href="/chat/new"
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start New Chat
            </Link>
          </div>
        </div>
      )}
    </div>
  );
});

ChatWindow.displayName = "ChatWindow";

export default ChatWindow;
