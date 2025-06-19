"use client";

import { getModelById } from "@/config/models";
import { useChatMessages } from "@/hooks/queries/use-chat-messages";
import { useChatSession } from "@/hooks/queries/use-chat-session";
import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { useMessageSummaries } from "@/hooks/queries/use-message-summaries";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatHandlers } from "@/hooks/use-chat-handlers";
import { useChatState } from "@/hooks/use-chat-state";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useSuggestedQuestions } from "@/hooks/use-suggested-questions";
import { useAuth } from "@/hooks/useAuth";
import {
  createSession,
  deleteFromPoint,
  getLatestStreamIdWithStatus,
  markStreamAsCancelled,
  saveAssistantMessage,
} from "@/services";
import { type ChatSession } from "@/services/chat-sessions";
import { useApiKeysStore } from "@/stores/api-keys-store";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { TypedImageGenerationAnnotation } from "@/types/annotations";
import { prepareMessageForDb } from "@/utils/message-utils";
import { useChat, type Message } from "@ai-sdk/react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatHeader } from "./chat-header";
import { ChatInput, type ChatInputRef } from "./chat-input";
import { ChatNavigator } from "./chat-navigator";
import { MessagesList } from "./messages-list";
import { SamplePrompts } from "./sample-prompts";

const SCROLL_TOP_MARGIN = 120;
const SCROLL_TO_BOTTOM_THRESHOLD = 100;
const SCROLL_ANIMATION_DURATION = 500;
const STREAMING_SCROLL_DEBOUNCE = 100;

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
  const justSubmittedMessageId = useRef<string | null>(null);
  const isInitialLoad = useRef(true);
  const userScrolled = useRef(false);
  const programmaticScroll = useRef(false);
  const lastUserMessageForSuggestions = useRef<Message | null>(null);
  const [isBranching, setIsBranching] = useState(false);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const navigatorRef = useRef<HTMLDivElement>(null);

  const {
    messages: queryMessages,
    isLoading: isLoadingMessages,
    invalidateMessages,
  } = useChatMessages(chatId);
  const { updateSessionInCache, invalidateSessions } = useChatSessions();
  const { summaries, invalidateSummaries } = useMessageSummaries(chatId);

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
    experimental_resume,
    data,
  } = useChat({
    api: "/api/chat",
    id: chatId === "new" ? undefined : chatId,
    initialMessages: messagesToUse,
    sendExtraMessageFields: true,
    generateId: () => uuidv4(),
    experimental_throttle: 100,
    body: (() => {
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
        isFirstMessage: chatId !== "new" && messagesToUse.length === 0,
        apiKey,
        assistantName,
        userTraits,
      };
    })(),
    onError: (error) => {
      console.error("useChat Hook Error", error, {
        chatId,
        selectedModel: selectedModel,
        reasoningLevel: reasoningLevel,
        searchEnabled: searchEnabled,
        memoryEnabled: memoryEnabled,
        messageCount: messages.length,
        status,
        input: input?.substring(0, 100),
        attachedFilesCount: state.attachedFiles.length,
      });

      const errorMessage = error.message || String(error);

      if (
        errorMessage.includes("CONTEXT_LENGTH_EXCEEDED") ||
        errorMessage.includes("TOKEN_LIMIT_EXCEEDED") ||
        errorMessage.includes("REQUEST_TOO_LARGE") ||
        (errorMessage.includes("context") && errorMessage.includes("length")) ||
        (errorMessage.includes("token") && errorMessage.includes("limit"))
      ) {
        updateState({
          uiError:
            "💬 Conversation is too long! Please start a new chat or try a shorter message. You can also try enabling web search to get more concise responses.",
        });
        return;
      }

      if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        updateState({
          uiError: "⏱️ Rate limit exceeded. Please wait a moment before sending another message.",
        });
        return;
      }

      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        updateState({
          uiError: "🌐 Network error. Please check your connection and try again.",
        });
        return;
      }

      updateState({
        uiError: "❌ Something went wrong. Please try again or start a new chat.",
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

          setMessages((currentMessages) =>
            currentMessages.map((msg) => (msg.id === message.id ? finalMessage : msg))
          );
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
            setMessages((currentMessages) =>
              currentMessages.map((msg) =>
                msg.id === message.id ? { ...msg, id: databaseId } : msg
              )
            );
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

  // Add suggested questions hook after useChat
  const {
    questions,
    isLoading: isLoadingQuestions,
    error: questionsError,
    fetchSuggestions,
    clearSuggestions,
  } = useSuggestedQuestions();

  const { showScrollToBottom, scrollToBottom } = useScrollToBottom({
    containerRef: messagesContainerRef,
    messagesLength: messages.length,
  });

  const handleDismissUiError = useCallback(() => {
    updateState({ uiError: null });
  }, [updateState]);

  const handleStop = useCallback(() => {
    stop();

    const lastAssistantMessage = messages.filter((m) => m.role === "assistant").at(-1);

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
    autoResume: !isLoadingMessages && chatId !== "new" && !isSharedView,
    initialMessages: messagesToUse,
    experimental_resume,
    data,
    setMessages,
    chatId: chatId !== "new" ? chatId : undefined,
  });

  // Scroll handling
  useLayoutEffect(() => {
    if (!justSubmittedMessageId.current) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    const messagesContainer = container.querySelector(".mx-auto.max-w-3xl") as HTMLElement;
    const messageElement = document.querySelector(
      `[data-message-id="${justSubmittedMessageId.current}"]`
    );

    if (messagesContainer && messageElement instanceof HTMLElement) {
      const containerHeight = container.clientHeight;
      const neededPadding = Math.max(containerHeight - 100, 200);
      if (!messagesContainer.dataset.originalPadding) {
        messagesContainer.dataset.originalPadding =
          getComputedStyle(messagesContainer).paddingBottom;
      }
      messagesContainer.style.paddingBottom = `${neededPadding}px`;

      requestAnimationFrame(() => {
        programmaticScroll.current = true;
        const messageOffsetTop = messageElement.offsetTop;
        const targetScrollTop = messageOffsetTop - SCROLL_TOP_MARGIN;
        container.scrollTo({
          top: targetScrollTop,
          behavior: "smooth",
        });

        setTimeout(() => {
          programmaticScroll.current = false;
        }, SCROLL_ANIMATION_DURATION);
      });
    }

    justSubmittedMessageId.current = null;
    userScrolled.current = false;
  }, [messages]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (justSubmittedMessageId.current) return;

    const isScrolledNearBottom =
      container.scrollHeight - container.clientHeight <=
      container.scrollTop + SCROLL_TO_BOTTOM_THRESHOLD;

    if (
      (isInitialLoad.current && messages.length > 0) ||
      (isScrolledNearBottom && !userScrolled.current)
    ) {
      programmaticScroll.current = true;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: status === "streaming" ? "auto" : "instant",
      });

      const timeout =
        status === "streaming" ? STREAMING_SCROLL_DEBOUNCE : SCROLL_ANIMATION_DURATION;
      setTimeout(() => {
        programmaticScroll.current = false;
      }, timeout);
    }

    if (isInitialLoad.current && messages.length > 0) {
      isInitialLoad.current = false;
    }
  }, [messages, status]);

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

        if (chatId && chatId !== "new") {
          await deleteFromPoint(userMessageToRetry.id);
          invalidateMessages();
        }

        clearSuggestions();
        setMessages((currentMessages) => currentMessages.slice(0, retryFromIndex));

        setTimeout(() => {
          lastUserMessageForSuggestions.current = userMessageToRetry;
          append(userMessageToRetry);
        }, 50);
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
    [messages, stop, chatId, updateState, invalidateMessages, setMessages, append, clearSuggestions]
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
          await deleteFromPoint(messageToEdit.id);
          invalidateMessages();
        }

        clearSuggestions();
        setMessages((currentMessages) => currentMessages.slice(0, messageIndex));

        const editedMessage: Message = {
          ...messageToEdit,
          id: uuidv4(),
          content: newContent,
          parts: [{ type: "text", text: newContent }],
        };

        justSubmittedMessageId.current = editedMessage.id;
        userScrolled.current = false;

        setTimeout(() => {
          lastUserMessageForSuggestions.current = editedMessage;
          append(editedMessage);
        }, 50);
      } catch (error) {
        console.error("Error during message edit:", error);
        updateState({
          uiError: "Failed to edit message. Please try again.",
        });
        if (chatId && chatId !== "new") {
          setTimeout(() => invalidateMessages(), 500);
        }
      }
    },
    [messages, stop, chatId, updateState, invalidateMessages, setMessages, append, clearSuggestions]
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

      justSubmittedMessageId.current = messageToAppend.id;
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
        setMessages([messageToAppend]);
        justSubmittedMessageId.current = messageToAppend.id;
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
          .catch((error) => {
            console.error("Failed to create new session in background:", error);
          });

        setInput("");
        updateState({ attachedFiles: [] });
        clearSuggestions();
        return;
      }

      justSubmittedMessageId.current = messageToAppend.id;
      userScrolled.current = false;

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

  return (
    <div className="relative flex h-full flex-col">
      <ChatHeader
        chatId={chatId}
        sessionData={sessionData || undefined}
        isSharedView={isSharedView}
        showNavigatorButton={showChatNavigator && messages.length > 0}
        onToggleNavigator={handleToggleNavigator}
      />

      {showSamplePrompts ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="mx-auto w-full max-w-3xl">
            {/* Personal Greeting */}
            {!useUserPreferencesStore.getState().hidePersonalInfo &&
              (() => {
                // Get user's display name from various sources
                const getUserDisplayName = () => {
                  if (!user) return null;

                  // Try to get name from user metadata first
                  const displayName =
                    user.user_metadata?.display_name ||
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name;

                  if (displayName) return displayName;

                  // Fall back to email username (part before @)
                  if (user.email) {
                    const emailUsername = user.email.split("@")[0];
                    if (emailUsername) {
                      // Capitalize first letter and replace dots/underscores with spaces
                      return emailUsername
                        .split(/[._-]/)
                        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(" ");
                    }
                  }

                  return null;
                };

                const displayName = getUserDisplayName();

                return (
                  <div className="mb-8 text-center">
                    <div className="rounded-lg bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 p-6">
                      <h2 className="mb-2 text-2xl font-semibold text-foreground">
                        {displayName
                          ? `Hello ${displayName}! How are you doing? 👋`
                          : "Hello! How are you doing? 👋"}
                      </h2>
                    </div>
                  </div>
                );
              })()}

            <SamplePrompts onPromptSelect={handlePromptSelect} className="" />
          </div>
        </div>
      ) : (
        <MessagesList
          messages={messages}
          isLoading={isLoading}
          isLoadingMessages={isLoadingMessages}
          chatId={chatId}
          onBranchChat={handleBranchChat}
          onRetryMessage={handleRetryMessage}
          onEditMessage={handleEditMessage}
          messagesContainerRef={messagesContainerRef}
          error={error}
          uiError={state.uiError}
          onDismissUiError={handleDismissUiError}
          onRetry={handleRetryFailedRequest}
          suggestedQuestions={questions}
          isLoadingQuestions={isLoadingQuestions}
          questionsError={questionsError}
          onQuestionSelect={handlePromptSelect}
          selectedModel={selectedModel}
          isBranching={isBranching}
          onBranchOptionsToggle={handleBranchOptionsToggle}
        />
      )}

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
          onClearUiError={handleDismissUiError}
          onPromptSelect={handlePromptSelect}
          showScrollToBottom={showScrollToBottom}
          onScrollToBottom={scrollToBottom}
          ref={chatInputRef}
        />
      )}

      <AnimatePresence>
        {isNavigatorOpen && (
          <ChatNavigator
            ref={navigatorRef}
            summaries={summaries}
            onSummaryClick={handleSummaryClick}
            isOpen={isNavigatorOpen}
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
