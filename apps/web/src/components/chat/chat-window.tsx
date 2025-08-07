"use client";

import { useSidebarContext } from "@/components/app-shell";
import { getModelById } from "@/config/models";
import { useChatMessages } from "@/hooks/queries/use-chat-messages";
import { useChatSession } from "@/hooks/queries/use-chat-session";
import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { useMessageSummaries } from "@/hooks/queries/use-message-summaries";

import { useChatHandlers } from "@/hooks/use-chat-handlers";
import { useChatScrollManager } from "@/hooks/use-chat-scroll-manager";
import { useChatState } from "@/hooks/use-chat-state";
import { useSuggestedQuestions } from "@/hooks/use-suggested-questions";
import { useAuth } from "@/hooks/useAuth";
import {
  createSession,
  deleteFromPoint,
  getLatestStreamIdWithStatus,
  saveAssistantMessage,
} from "@/services";
import { type ChatSession } from "@/services/chat-sessions";
import { useApiKeysStore } from "@/stores/api-keys-store";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { prepareMessageForDb } from "@/utils/database-message-converter";

import { type CustomUIMessage } from "@/types/custom-ui-message";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatHeader } from "./chat-header";
import { ChatInput, type ChatInputRef } from "./chat-input";
import { ChatNavigator } from "./chat-navigator";
import { HeroSection } from "./hero-section";
import { MessagesList } from "./messages-list";

const SCROLL_TOP_MARGIN = 120;

interface ChatWindowProps {
  chatId: string;
  isSharedView?: boolean;
  key?: string;
}

const ChatWindow = memo(({ chatId, isSharedView = false }: ChatWindowProps) => {
  const { isSidebarOpen } = useSidebarContext();
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
  const { assistantName, userTraits, memoryEnabled, showChatNavigator } = useUserPreferencesStore();
  const router = useRouter();
  const lastUserMessageForSuggestions = useRef<CustomUIMessage | null>(null);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const navigatorRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const chatInputContainerRef = useRef<HTMLDivElement>(null);
  const [messagesContainerMinHeight, setMessagesContainerMinHeight] = useState<
    number | undefined
  >();

  const {
    messages: initialMessages,
    isLoading: isLoadingInitialMessages,
    invalidateMessages,
    deleteMessage: deleteMessageMutation,
    isDeletingMessage,
  } = useChatMessages(chatId);

  const isLoadingMessages = isLoadingInitialMessages;
  const { updateSessionInCache, invalidateSessions } = useChatSessions();
  const { summaries, invalidateSummaries } = useMessageSummaries(chatId);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const chatBody = useMemo(() => {
    const modelConfig = getModelById(selectedModel);
    const provider = modelConfig?.provider;
    const apiKey =
      provider && useApiKeysStore.getState().shouldUseProviderKey(provider)
        ? useApiKeysStore.getState().getApiKey(provider)
        : undefined;

    return {
      model: selectedModel,
      reasoningLevel: reasoningLevel,
      searchEnabled: searchEnabled,
      memoryEnabled: memoryEnabled,
      showChatNavigator: showChatNavigator,
      id: chatId === "new" ? undefined : chatId,
      isFirstMessage: chatId !== "new" && initialMessages.length === 0,
      apiKey,
      assistantName,
      userTraits,
    };
  }, [
    selectedModel,
    reasoningLevel,
    searchEnabled,
    memoryEnabled,
    showChatNavigator,
    chatId,
    initialMessages.length,
    assistantName,
    userTraits,
  ]);

  const {
    handleFileAttach,
    handleFileDrop,
    handleRemoveFile,
    handleBranchChat,
    handleModelChange,
  } = useChatHandlers(
    chatId,
    state,
    updateState,
    updateSessionInCache,
    transferModelSelection,
    router,
    user
  );

  const [input, setInput] = useState("");

  const { messages, status, error, sendMessage, stop, setMessages } = useChat<CustomUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: chatBody,
    }),
    id: chatId === "new" ? undefined : chatId,
    experimental_throttle: 100,
    onError: (error) => {
      // The `useChat` hook's `error` object will be populated.
      // We log it here for debugging, but we don't need to set a separate `uiError`
      // state as that would be redundant. `ErrorDisplay` will use the `error` object.
      console.error("An error occurred in the chat stream:", error);
    },
    onFinish: async ({ message }: { message: CustomUIMessage }) => {
      console.log("onFinish", message);
      if (process.env.NODE_ENV === "development") {
        console.log("Chat stream finished", {
          chatId,
          selectedModel: selectedModel,
          messageId: message.id,
          timestamp: new Date().toISOString(),
        });
      }

      if (messagesContainerRef.current) {
        const messagesContainer = messagesContainerRef.current.querySelector(".mx-auto.max-w-3xl");
        if (messagesContainer) {
          const messagesContainerElement = messagesContainer as HTMLElement;
          const originalPadding = messagesContainerElement.dataset.originalPadding || "2rem";
          messagesContainerElement.style.paddingBottom = originalPadding;
        }
      }

      // Check for message complete data in metadata
      const messageCompleteData = message.metadata;

      let hasGrounding = false;

      if (messageCompleteData && typeof messageCompleteData === "object") {
        const annotationData = messageCompleteData as {
          databaseId?: string;
          messageSaved?: boolean;
          titleGenerated?: string;
          userId?: string;
          hasGrounding?: boolean;
        };

        hasGrounding = annotationData.hasGrounding ?? false;

        console.log("Processing message_complete metadata:", {
          originalId: message.id,
          databaseId: annotationData.databaseId,
          messageSaved: annotationData.messageSaved,
          hasTitle: !!annotationData.titleGenerated,
          hasGrounding: annotationData.hasGrounding,
        });

        if (annotationData.messageSaved && annotationData.databaseId) {
          const databaseId = annotationData.databaseId;
          setMessages((currentMessages) => {
            const updatedMessages = currentMessages.map((msg) =>
              msg.id === message.id ? { ...msg, id: databaseId } : msg
            );
            return updatedMessages;
          });
        }

        if (annotationData.titleGenerated && annotationData.userId && chatId !== "new") {
          const sessionUpdate: ChatSession = {
            id: chatId,
            title: annotationData.titleGenerated,
            updated_at: new Date().toISOString(),
          } as ChatSession;

          updateSessionInCache(sessionUpdate, annotationData.userId);
        }
      }

      if (message.role === "assistant") {
        const assistantText = message.parts.find((p) => p.type === "text")?.text;
        const lastUserMessage = messages.filter((m) => m.role === "user").at(-1);
        if (lastUserMessage && assistantText) {
          const userText = lastUserMessage.parts.find((p) => p.type === "text")?.text;
          if (userText) {
            fetchSuggestions(userText, assistantText);
          }
        }
      }

      if (chatId && chatId !== "new") {
        const delay = hasGrounding ? 200 : 100;
        console.log(
          `Scheduling invalidateMessages with ${delay}ms delay (hasGrounding: ${hasGrounding})`
        );

        setTimeout(() => {
          invalidateMessages();
        }, delay);
      }

      if (showChatNavigator) {
        invalidateSummaries();
      }
    },
  });

  useEffect(() => {
    if (status === "ready" && initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages, messages.length, setMessages, status]);

  // Add suggested questions hook after useChat
  const {
    questions,
    isLoading: isLoadingQuestions,
    error: questionsError,
    fetchSuggestions,
    clearSuggestions,
  } = useSuggestedQuestions();

  const { showScrollToBottom, scrollToBottom, setJustSubmittedMessageId } = useChatScrollManager({
    chatContainerRef: messagesContainerRef,
    messages,
    chatId,
  });

  const handleDismissUiError = useCallback(() => {
    updateState({ uiError: null });
  }, [updateState]);

  const handleStop = useCallback(() => {
    stop();

    if (chatId && chatId !== "new") {
      getLatestStreamIdWithStatus(chatId)
        .then((latestStream) => {
          if (latestStream && !latestStream.cancelled) {
            console.log(`Sending cancel request for stream ${latestStream.streamId}`);
            // Fire-and-forget cancellation request
            fetch("/api/chat/cancel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chatId, streamId: latestStream.streamId }),
            }).catch((e) => console.error("Failed to send cancel request", e));
          }
        })
        .catch((error) => {
          console.error("Error retrieving latest stream to cancel:", error);
        });
    }

    const lastAssistantMessage = messages.filter((m) => m.role === "assistant").at(-1);

    // Then, if a partial message exists, save it
    if (lastAssistantMessage && chatId !== "new" && user) {
      console.log("Saving partial message due to user stop:", lastAssistantMessage);

      const modelConfig = getModelById(selectedModel);
      const modelProvider = modelConfig?.provider || "Unknown";

      // In AI SDK v5, work with UIMessages directly
      const preparedMessage = prepareMessageForDb({
        message: lastAssistantMessage,
        sessionId: chatId,
        userId: user.id,
        model: selectedModel,
        modelProvider,
        reasoningLevel: reasoningLevel,
        searchEnabled: searchEnabled,
      });

      if (Array.isArray(preparedMessage.parts) && preparedMessage.parts.length > 0) {
        saveAssistantMessage(
          lastAssistantMessage,
          chatId,
          user.id,
          selectedModel,
          modelProvider,
          { reasoningLevel: reasoningLevel, searchEnabled: searchEnabled },
          { fireAndForget: true }
        );
      }
    }
  }, [stop, chatId, messages, user, selectedModel, reasoningLevel, searchEnabled]);

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
      sendMessage(lastUserMessage);
    } catch (error) {
      console.error("Error during request retry:", error);
      updateState({
        uiError: "Failed to retry request. Please try again.",
      });
    }
  }, [messages, stop, updateState, sendMessage]);

  // Message actions
  const handleRetryMessage = useCallback(
    async (messageId: string) => {
      try {
        updateState({ uiError: null });
        stop();

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

        let userMessageToRetry: CustomUIMessage;
        let retryFromIndex: number;

        if (clickedMessage.role === "user") {
          userMessageToRetry = clickedMessage;
          retryFromIndex = clickedMessageIndex;
        } else {
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

        // Keep messages up to but NOT including the user message we're retrying
        const messagesToKeep = messages.slice(0, retryFromIndex);

        if (chatId && chatId !== "new") {
          // Delete from the user message we're retrying (inclusive)
          await deleteFromPoint(userMessageToRetry.id, true);
        }

        clearSuggestions();
        // Set messages to exclude the retry point and everything after
        setMessages(messagesToKeep);

        // Resend the same user message (this will add it back and generate new response)
        sendMessage(userMessageToRetry, {
          body: {
            ...chatBody,
            isFirstMessage: messagesToKeep.length === 0,
          },
        });
      } catch (error) {
        console.error("Error during message retry:", error);
        updateState({
          uiError: "Failed to retry message. Please try again.",
        });
        if (chatId && chatId !== "new") {
          invalidateMessages();
        }
      }
    },
    [
      messages,
      stop,
      chatId,
      updateState,
      invalidateMessages,
      setMessages,
      clearSuggestions,
      sendMessage,
      chatBody,
    ]
  );

  const handleEditMessage = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        updateState({ uiError: null });
        stop();

        const messageIndex = messages.findIndex((m) => m.id === messageId);
        if (messageIndex === -1) {
          console.error("Edit failed: message not found", { messageId });
          updateState({ uiError: "Message to edit not found." });
          return;
        }

        const messageToEdit = messages[messageIndex];
        if (!messageToEdit) {
          console.error("Edit failed: message object not found", { messageId });
          updateState({ uiError: "Message to edit not found." });
          return;
        }

        if (messageToEdit.role !== "user") {
          updateState({ uiError: "Only user messages can be edited." });
          return;
        }

        if (!newContent.trim()) {
          updateState({ uiError: "Message content cannot be empty." });
          return;
        }

        if (chatId && chatId !== "new") {
          await deleteFromPoint(messageToEdit.id, true);
        }

        const editedMessage: CustomUIMessage = {
          ...messageToEdit,
          parts: [{ type: "text", text: newContent }],
        };

        const messagesToKeep = messages.slice(0, messageIndex);
        const newMessages = [...messagesToKeep, editedMessage];

        clearSuggestions();
        setMessages(newMessages);

        sendMessage(editedMessage, {
          body: {
            ...chatBody,
            isFirstMessage: newMessages.length === 1,
          },
        });
      } catch (error) {
        console.error("Error during message edit:", error);
        updateState({
          uiError: "Failed to edit message. Please try again.",
        });
        if (chatId && chatId !== "new") {
          invalidateMessages();
        }
      }
    },
    [
      messages,
      stop,
      chatId,
      updateState,
      invalidateMessages,
      setMessages,
      sendMessage,
      chatBody,
      clearSuggestions,
    ]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      const previousMessages = messages;
      // Optimistically update the UI for all cases
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      clearSuggestions();
      updateState({ uiError: null });

      // For existing sessions, call the mutation to delete from DB
      if (chatId !== "new") {
        deleteMessageMutation(messageId, {
          onError: (error) => {
            // If the mutation fails, roll back the UI change and show an error
            setMessages(previousMessages);
            updateState({ uiError: "Failed to delete message. Please try again." });
            console.error("Error deleting message:", error);
          },
        });
      }
    },
    [messages, setMessages, clearSuggestions, updateState, chatId, deleteMessageMutation]
  );

  // Form handling
  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      updateState({ uiError: null });

      const isLoading = status === "submitted" || status === "streaming";
      if (isLoading) {
        return;
      }

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
        parts: [...textPart, ...fileParts] as CustomUIMessage["parts"],
      } as CustomUIMessage;

      lastUserMessageForSuggestions.current = messageToAppend;

      if (chatId === "new") {
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const newSessionId = uuidv4();
        setMessages([messageToAppend]);
        setJustSubmittedMessageId(messageToAppend.id);
        router.push(`/chat/${newSessionId}`);

        const messageData = {
          message: messageToAppend,
          chatRequestOptions: {
            data: {
              ...chatBody,
              isFirstMessage: true,
              attachments,
            },
          },
          selectedModel,
          reasoningLevel,
          searchEnabled,
        };
        sessionStorage.setItem("pendingFirstMessage", JSON.stringify(messageData));

        createSession(user.id, "New Chat", undefined, newSessionId)
          .then(() => {
            invalidateSessions();
            transferModelSelection("new", newSessionId);
          })
          .catch((error: unknown) => {
            console.error("Failed to create new session in background:", error);
          });

        setInput("");
        updateState({ attachedFiles: [] });
        clearSuggestions();
        return;
      }

      setJustSubmittedMessageId(messageToAppend.id);

      lastUserMessageForSuggestions.current = messageToAppend;
      sendMessage(messageToAppend, {
        body: {
          ...chatBody,
          isFirstMessage: messages.length === 0,
          attachments,
        },
      });

      setInput("");
      updateState({ attachedFiles: [] });
      clearSuggestions();
      setTimeout(() => chatInputRef.current?.focus(), 0);
    },
    [
      sendMessage,
      state.attachedFiles,
      input,
      setInput,
      updateState,
      chatId,
      user,
      selectedModel,
      reasoningLevel,
      searchEnabled,
      router,
      invalidateSessions,
      transferModelSelection,
      setMessages,
      status,
      clearSuggestions,
      setJustSubmittedMessageId,
      messages.length,
      chatBody,
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

  // Handle pending first message from sessionStorage for new sessions
  useEffect(() => {
    if (chatId === "new") return;

    const pendingMessageData = sessionStorage.getItem("pendingFirstMessage");
    if (!pendingMessageData) return;

    try {
      const {
        message,
        chatRequestOptions,
        reasoningLevel,
        searchEnabled,
        selectedModel: storedModel,
      } = JSON.parse(pendingMessageData);

      sessionStorage.removeItem("pendingFirstMessage");

      if (reasoningLevel !== undefined) {
        setReasoningLevel(reasoningLevel);
      }
      if (searchEnabled !== undefined) {
        setSearchEnabled(searchEnabled);
      }

      if (storedModel && storedModel !== selectedModel) {
        handleModelChange(storedModel);
      }

      lastUserMessageForSuggestions.current = message;
      sendMessage(message, chatRequestOptions);
      setInput("");
      updateState({ attachedFiles: [] });
      setTimeout(() => chatInputRef.current?.focus(), 0);
    } catch (error) {
      console.error("Failed to process pending message:", error);
      sessionStorage.removeItem("pendingFirstMessage");
    }
  }, [
    chatId,
    sendMessage,
    setInput,
    updateState,
    setReasoningLevel,
    setSearchEnabled,
    handleModelChange,
    selectedModel,
    clearSuggestions,
  ]);

  const isLoading = status === "submitted" || status === "streaming";

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
  const { data: sessionData } = useChatSession(chatId);

  const showSamplePrompts = !isLoadingMessages && !messages.length && chatId === "new";

  const handleToggleNavigator = useCallback(() => {
    setIsNavigatorOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetElement = event.target as HTMLElement;
      if (targetElement.closest('[data-testid="chat-navigator-toggle"]')) {
        return;
      }

      if (navigatorRef.current && !navigatorRef.current.contains(event.target as Node)) {
        setIsNavigatorOpen(false);
      }
    };

    if (isNavigatorOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNavigatorOpen]);

  const handleSummaryClick = useCallback((messageId: string) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const messageRect = messageElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const scrollTop =
        container.scrollTop + messageRect.top - containerRect.top - SCROLL_TOP_MARGIN;

      container.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    const calculateMinHeight = () => {
      const headerHeight = headerRef.current?.offsetHeight || 0;
      const chatInputHeight = chatInputContainerRef.current?.offsetHeight || 0;
      const messagesContainerVerticalPadding = 100;
      const minHeight =
        window.innerHeight - headerHeight - chatInputHeight - messagesContainerVerticalPadding;
      setMessagesContainerMinHeight(minHeight > 0 ? minHeight : 0);
    };

    calculateMinHeight();
    const resizeObserver = new ResizeObserver(calculateMinHeight);
    if (headerRef.current) resizeObserver.observe(headerRef.current);
    if (chatInputContainerRef.current) resizeObserver.observe(chatInputContainerRef.current);
    window.addEventListener("resize", calculateMinHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", calculateMinHeight);
    };
  }, []);

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden border-divider bg-content1 ${isSidebarOpen ? "lg:rounded-tl-2xl lg:border-l lg:border-t" : ""}`}
    >
      <ChatHeader
        ref={headerRef}
        chatId={chatId}
        sessionData={sessionData || undefined}
        isSharedView={isSharedView}
        showNavigatorButton={showChatNavigator && messages.length > 0}
        onToggleNavigator={handleToggleNavigator}
      />
      <div ref={messagesContainerRef} className="relative flex-1 overflow-y-auto">
        {showSamplePrompts ? (
          <HeroSection onPromptSelect={handlePromptSelect} />
        ) : (
          <MessagesList
            messages={messages}
            isLoading={isLoading}
            isLoadingMessages={isLoadingMessages}
            chatId={chatId}
            onBranchChat={handleBranchChat}
            onRetryMessage={handleRetryMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            isDeletingMessage={isDeletingMessage}
            error={error}
            uiError={state.uiError}
            onDismissUiError={handleDismissUiError}
            onRetry={handleRetryFailedRequest}
            suggestedQuestions={questions}
            isLoadingQuestions={isLoadingQuestions}
            questionsError={questionsError}
            onQuestionSelect={handlePromptSelect}
            messagesContainerMinHeight={messagesContainerMinHeight}
          />
        )}
      </div>

      {!isSharedView && (
        <div ref={chatInputContainerRef} className="shrink-0">
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
            onFileDrop={handleFileDrop}
            onRemoveFile={handleRemoveFile}
            onStop={handleStop}
            onClearUiError={handleDismissUiError}
            onPromptSelect={handlePromptSelect}
            showScrollToBottom={showScrollToBottom}
            onScrollToBottom={scrollToBottom}
            ref={chatInputRef}
          />
        </div>
      )}

      <AnimatePresence>
        {isNavigatorOpen && (
          <ChatNavigator
            ref={navigatorRef}
            summaries={summaries}
            onSummaryClick={handleSummaryClick}
            isOpen={isNavigatorOpen}
            onClose={handleToggleNavigator}
          />
        )}
      </AnimatePresence>

      {isSharedView && (
        <div className="border-t border-divider bg-content1/50 px-4 py-4">
          <div className="flex items-center justify-center gap-4 text-sm text-default-600">
            <span>Want to start your own conversation?</span>
            <Link
              href="/"
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
