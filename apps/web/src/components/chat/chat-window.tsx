"use client";

import { useSidebarContext } from "@/components/app-shell";
import { getModelById } from "@/config/models";
import { useChatMessages } from "@/hooks/queries/use-chat-messages";
import { useChatSession } from "@/hooks/queries/use-chat-session";
import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { useMessageSummaries } from "@/hooks/queries/use-message-summaries";

import { useAuth } from "@/hooks/use-auth";
import { useChatHandlers } from "@/hooks/use-chat-handlers";
import { useChatScrollManager } from "@/hooks/use-chat-scroll-manager";
import { useChatState } from "@/hooks/use-chat-state";
import { useSuggestedQuestions } from "@/hooks/use-suggested-questions";
import { deleteFromPoint, saveAssistantMessage } from "@/services/client/chat-messages";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { type Tables } from "@/types/supabase-types";
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
    imageGenerationEnabled,
    setImageGenerationEnabled,
  } = useChatState(chatId);
  const { pendingChatData, clearPendingChatData, setPendingChatData } = useModelSelectorStore();
  const { user } = useAuth();
  const { assistantName, userTraits, memoryEnabled, showChatNavigator } = useUserPreferencesStore();
  const router = useRouter();
  const lastUserMessageForSuggestions = useRef<CustomUIMessage | null>(null);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const navigatorRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const chatInputContainerRef = useRef<HTMLDivElement>(null);

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
    // API keys are now handled server-side from database
    const apiKey = undefined;

    // Ensure we always have a valid ID
    const finalId = chatId === "new" ? undefined : chatId;

    const body = {
      model: selectedModel,
      reasoningLevel: reasoningLevel,
      searchEnabled: searchEnabled,
      imageGenerationEnabled: imageGenerationEnabled,
      memoryEnabled: memoryEnabled,
      showChatNavigator: showChatNavigator,
      sessionId: finalId,
      isFirstMessage: chatId !== "new" && initialMessages.length === 0,
      apiKey,
      assistantName,
      userTraits,
    };

    return body;
  }, [
    selectedModel,
    reasoningLevel,
    searchEnabled,
    imageGenerationEnabled,
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
  } = useChatHandlers(chatId, state, updateState, updateSessionInCache, router, user);

  const [input, setInput] = useState("");

  // Create a stable reference to chatBody by including chatId in dependencies
  const stableChatBody = useMemo(() => {
    return {
      ...chatBody,
      // Explicitly ensure the sessionId is the full chatId, not a short ID
      sessionId: chatId === "new" ? undefined : chatId,
    };
  }, [
    chatId,
    chatBody.model,
    chatBody.reasoningLevel,
    chatBody.searchEnabled,
    chatBody.imageGenerationEnabled,
    chatBody.memoryEnabled,
    chatBody.showChatNavigator,
    chatBody.isFirstMessage,
    chatBody.assistantName,
    chatBody.userTraits,
  ]);

  const { messages, status, error, sendMessage, stop, setMessages } = useChat<CustomUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: stableChatBody,
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
      if (messagesContainerRef.current) {
        const messagesContainer = messagesContainerRef.current.querySelector(".mx-auto.max-w-3xl");
        if (messagesContainer) {
          const messagesContainerElement = messagesContainer as HTMLElement;
          const originalPadding = messagesContainerElement.dataset.originalPadding || "2rem";
          messagesContainerElement.style.paddingBottom = originalPadding;
        }
      }

      // Check for grounding and title data in data parts (AI SDK v5)
      const groundingParts = message.parts?.filter((part) => part.type === "data-grounding") || [];
      const titleParts = message.parts?.filter((part) => part.type === "data-titleGenerated") || [];

      let hasGrounding = false;

      // Handle grounding data parts
      if (groundingParts.length > 0) {
        const latestGrounding = groundingParts[groundingParts.length - 1];
        if (latestGrounding && latestGrounding.data) {
          hasGrounding = latestGrounding.data.hasGrounding ?? false;
        }
      }

      // Extract metadata from message
      const { databaseId, messageSaved, userId } = (message.metadata || {}) as {
        databaseId?: string;
        messageSaved?: boolean;
        userId?: string;
      };

      // Handle title generation data parts
      if (titleParts.length > 0 && chatId !== "new") {
        const latestTitle = titleParts[titleParts.length - 1];
        if (latestTitle && latestTitle.data) {
          const generatedTitle = latestTitle.data.title;

          if (generatedTitle && userId) {
            const sessionUpdate: Tables<"chat_sessions"> = {
              id: chatId,
              title: generatedTitle,
              updated_at: new Date().toISOString(),
            } as Tables<"chat_sessions">;

            updateSessionInCache(sessionUpdate, userId);
          }
        }
      }

      if (messageSaved && databaseId) {
        setMessages((current) =>
          current.map((msg) => (msg.id === message.id ? { ...msg, id: databaseId } : msg))
        );
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

        setTimeout(() => {
          invalidateMessages();
        }, delay);
      }

      if (showChatNavigator) {
        invalidateSummaries();
      }
    },
  });

  // Check for pending messages to send (for new chat redirects)
  const hasProcessedPendingMessage = useRef(false);
  useEffect(() => {
    if (chatId !== "new" && pendingChatData && !hasProcessedPendingMessage.current) {
      hasProcessedPendingMessage.current = true;
      try {
        const { message, body: pendingChatBody } = pendingChatData;

        // Send the pending message
        sendMessage(message, {
          body: pendingChatBody,
        });

        // Clear from store
        clearPendingChatData();
      } catch (error) {
        console.error("Error processing pending chat message:", error);
        clearPendingChatData();
        hasProcessedPendingMessage.current = false;
      }
    }
  }, [chatId, pendingChatData, clearPendingChatData]);

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

  const handleStop = useCallback(async () => {
    stop();

    const lastAssistantMessage = messages.filter((m) => m.role === "assistant").at(-1);

    // Then, if a partial message exists, save it
    if (lastAssistantMessage && chatId !== "new" && user) {
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
          {
            reasoningLevel: reasoningLevel,
            searchEnabled: searchEnabled,
            imageGenerationEnabled: imageGenerationEnabled,
          },
          { fireAndForget: true }
        );
      }
    }
  }, [
    stop,
    chatId,
    messages,
    user,
    selectedModel,
    reasoningLevel,
    searchEnabled,
    imageGenerationEnabled,
  ]);

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
          updateState({ uiError: "Message to retry not found." });
          return;
        }

        const clickedMessage = messages[clickedMessageIndex];
        if (!clickedMessage) {
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
          updateState({ uiError: "Message to edit not found." });
          return;
        }

        const messageToEdit = messages[messageIndex];
        if (!messageToEdit) {
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
        mediaType: att.contentType,
        url: att.url,
        filename: att.name,
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

        // Save message to store to send after redirect
        setPendingChatData({
          message: messageToAppend,
          body: {
            ...chatBody,
            isFirstMessage: true,
          },
          attachments: validAttachedFiles,
          timestamp: Date.now(),
        });

        setMessages([messageToAppend]);
        setJustSubmittedMessageId(messageToAppend.id);

        // Redirect to new chat URL - the new page will send the message
        router.push(`/chat/${newSessionId}`);

        setInput("");
        updateState({ attachedFiles: [] });
        clearSuggestions();
        return;
      }

      // For existing chats, if this is the first message, transfer model selection to a new chat if branching
      if (messages.length === 0) {
        // This is the first message in an existing chat, but we're not creating a new chat
        // The model is already set for this chat ID in the store
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
      imageGenerationEnabled,
      router,
      invalidateSessions,
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
            imageGenerationEnabled={imageGenerationEnabled}
            chatId={chatId}
            onSubmit={handleFormSubmit}
            onKeyDown={handleKeyDown}
            onModelChange={handleModelChange}
            onReasoningLevelChange={setReasoningLevel}
            onSearchToggle={setSearchEnabled}
            onImageGenerationToggle={setImageGenerationEnabled}
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
