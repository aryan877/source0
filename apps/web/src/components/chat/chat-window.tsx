"use client";

import { getModelById } from "@/config/models";
import { useChatMessages } from "@/hooks/queries/use-chat-messages";
import { useChatSession } from "@/hooks/queries/use-chat-session";
import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { useMessageSummaries } from "@/hooks/queries/use-message-summaries";
import { useAutoResume } from "@/hooks/use-auto-resume";
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
import { TypedImageGenerationAnnotation } from "@/types/annotations";
import { ensureUniqueMessages, prepareMessageForDb } from "@/utils/database-message-converter";
import { useChat, type Message } from "@ai-sdk/react";
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
  const lastUserMessageForSuggestions = useRef<Message | null>(null);
  const [isBranching, setIsBranching] = useState(false);
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

  const {
    messages,
    input,
    setInput,
    status,
    stop,
    error,
    append,
    reload,
    setMessages,
    experimental_resume,
    data,
  } = useChat({
    api: "/api/chat",
    id: chatId === "new" ? undefined : chatId,
    initialMessages: [],
    sendExtraMessageFields: true,
    generateId: () => uuidv4(),
    experimental_throttle: 100,
    body: chatBody,
    onError: (error) => {
      // The `useChat` hook's `error` object will be populated.
      // We log it here for debugging, but we don't need to set a separate `uiError`
      // state as that would be redundant. `ErrorDisplay` will use the `error` object.
      console.error("An error occurred in the chat stream:", error);
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

        // Clear any existing error first to prevent stacking
        updateState({ uiError: null });

        if (response.status === 413) {
          updateState({
            uiError:
              "📝 Your message is too long. Please try shortening it or breaking it into smaller parts.",
          });
        } else if (response.status === 429) {
          updateState({
            uiError: "⏱️ Rate limit exceeded. Please wait a moment before sending another message.",
          });
        } else if (response.status >= 500) {
          updateState({
            uiError: "🔧 Server error. Please try again in a moment.",
          });
        } else if (response.status === 401) {
          updateState({
            uiError: "🔐 Authentication error. Please refresh the page and try again.",
          });
        } else {
          // Generic error for other HTTP status codes
          updateState({
            uiError: `Request failed with status ${response.status}. Please try again.`,
          });
        }
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

      if (messagesContainerRef.current) {
        const messagesContainer = messagesContainerRef.current.querySelector(".mx-auto.max-w-3xl");
        if (messagesContainer) {
          const messagesContainerElement = messagesContainer as HTMLElement;
          const originalPadding = messagesContainerElement.dataset.originalPadding || "2rem";
          messagesContainerElement.style.paddingBottom = originalPadding;
        }
      }

      const imageGenerationAnnotation = message.annotations?.find(
        (a): a is TypedImageGenerationAnnotation =>
          typeof a === "object" &&
          a !== null &&
          !Array.isArray(a) &&
          (a as { type?: string }).type === "image_generation_complete"
      );

      if (imageGenerationAnnotation) {
        const data = imageGenerationAnnotation.data;
        if (data.databaseId && data.content && data.filePart) {
          const filePart = {
            type: "file" as const,
            mimeType: data.filePart.mimeType,
            url: data.filePart.url,
            filename: data.filePart.filename,
          };

          const finalMessage: Message = {
            id: data.databaseId,
            role: "assistant",
            content: data.content,
            parts: [filePart as unknown] as Message["parts"],
            createdAt: new Date(),
          };

          setMessages((currentMessages) => {
            const updatedMessages = currentMessages.map((msg) =>
              msg.id === message.id ? finalMessage : msg
            );
            return ensureUniqueMessages(updatedMessages);
          });
        }
      }

      const messageCompleteAnnotation = message.annotations?.find(
        (a) =>
          typeof a === "object" &&
          a !== null &&
          !Array.isArray(a) &&
          (a as { type?: unknown }).type === "message_complete"
      );

      let hasGrounding = false;

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

          hasGrounding = annotationData.hasGrounding ?? false;

          console.log("Processing message_complete annotation:", {
            originalId: message.id,
            databaseId: annotationData.databaseId,
            messageSaved: annotationData.messageSaved,
            hasTitle: !!annotationData.titleGenerated,
            hasGrounding: annotationData.hasGrounding,
            annotationCount: message.annotations?.length || 0,
          });

          if (annotationData.messageSaved && annotationData.databaseId) {
            const databaseId = annotationData.databaseId;
            setMessages((currentMessages) => {
              const updatedMessages = currentMessages.map((msg) =>
                msg.id === message.id ? { ...msg, id: databaseId } : msg
              );
              return ensureUniqueMessages(updatedMessages);
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

      if (message.role === "assistant" && message.content) {
        const userMessage = lastUserMessageForSuggestions.current;
        if (userMessage && userMessage.content) {
          fetchSuggestions(userMessage.content, message.content);
        }
        // Clear the ref after use
        lastUserMessageForSuggestions.current = null;
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
      setMessages(ensureUniqueMessages(initialMessages));
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

      const preparedMessage = prepareMessageForDb({
        message: lastAssistantMessage,
        sessionId: chatId,
        userId: user.id,
        model: selectedModel,
        modelProvider,
        reasoningLevel: reasoningLevel,
        searchEnabled: searchEnabled,
      });

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
      await append(lastUserMessage);
    } catch (error) {
      console.error("Error during request retry:", error);
      updateState({
        uiError: "Failed to retry request. Please try again.",
      });
    }
  }, [messages, stop, updateState, append]);

  useAutoResume({
    autoResume: chatId !== "new" && !isSharedView,
    initialMessages,
    messages,
    experimental_resume,
    data,
    setMessages,
    chatId: chatId !== "new" ? chatId : undefined,
  });

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

        let userMessageToRetry: Message;
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

        const messagesToKeep = messages.slice(0, retryFromIndex + 1);

        if (chatId && chatId !== "new") {
          await deleteFromPoint(userMessageToRetry.id);
        }

        clearSuggestions();
        setMessages(messagesToKeep);

        await reload();
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
    [messages, stop, chatId, updateState, invalidateMessages, setMessages, clearSuggestions, reload]
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

        const editedMessage: Message = {
          ...messageToEdit,
          content: newContent,
          parts: [{ type: "text", text: newContent }],
        };

        const messagesToKeep = messages.slice(0, messageIndex);
        const newMessages = [...messagesToKeep, editedMessage];

        clearSuggestions();
        setMessages(newMessages);

        await reload();
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
    [messages, stop, chatId, updateState, invalidateMessages, setMessages, reload, clearSuggestions]
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
        content: input.trim(),
        parts: [...textPart, ...fileParts] as Message["parts"],
      } as Message;

      lastUserMessageForSuggestions.current = messageToAppend;

      const chatRequestOptions =
        attachments.length > 0
          ? {
              experimental_attachments: attachments,
            }
          : undefined;

      if (chatId === "new") {
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const newSessionId = uuidv4();
        setMessages(ensureUniqueMessages([messageToAppend]));
        setJustSubmittedMessageId(messageToAppend.id);
        router.push(`/chat/${newSessionId}`);

        const messageData = {
          message: messageToAppend,
          chatRequestOptions: { ...chatRequestOptions, isFirstMessage: true },
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
      append(messageToAppend, chatRequestOptions);

      setInput("");
      updateState({ attachedFiles: [] });
      clearSuggestions();
      setTimeout(() => chatInputRef.current?.focus(), 0);
    },
    [
      append,
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
      append(message, chatRequestOptions);
      setInput("");
      updateState({ attachedFiles: [] });
      setTimeout(() => chatInputRef.current?.focus(), 0);
    } catch (error) {
      console.error("Failed to process pending message:", error);
      sessionStorage.removeItem("pendingFirstMessage");
    }
  }, [
    chatId,
    append,
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

  const handleBranchOptionsToggle = useCallback((isOpen: boolean) => {
    setIsBranching(isOpen);
  }, []);

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
    <div className="relative flex h-full flex-col">
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
            error={error}
            uiError={state.uiError}
            onDismissUiError={handleDismissUiError}
            onRetry={handleRetryFailedRequest}
            suggestedQuestions={questions}
            isLoadingQuestions={isLoadingQuestions}
            questionsError={questionsError}
            onQuestionSelect={handlePromptSelect}
            isBranching={isBranching}
            onBranchOptionsToggle={handleBranchOptionsToggle}
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
