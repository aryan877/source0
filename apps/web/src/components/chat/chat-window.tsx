"use client";

import { useChatMessages } from "@/hooks/queries/use-chat-messages";
import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatHandlers } from "@/hooks/use-chat-handlers";
import { useChatState } from "@/hooks/use-chat-state";
import { useScrollManagement } from "@/hooks/use-scroll-management";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteFromPoint,
  getLatestStreamIdWithStatus,
  markStreamAsCancelled,
  MessagePart,
  saveAssistantMessage,
} from "@/services";
import { createSession, type ChatSession } from "@/services/chat-sessions";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useChat, type Message } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatInput, type ChatInputRef } from "./chat-input";
import { MessagesList } from "./messages-list";

interface ChatWindowProps {
  chatId: string;
}

const ChatWindow = memo(({ chatId }: ChatWindowProps) => {
  const { state, updateState, selectedModel } = useChatState(chatId);
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

  const { messagesContainerRef, messagesEndRef, showScrollToBottom, scrollToBottom } =
    useScrollManagement();

  const { handleFileAttach, handleRemoveFile, handleBranchChat, handleModelChange } =
    useChatHandlers(
      chatId,
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
      reasoningLevel: state.reasoningLevel,
      searchEnabled: state.searchEnabled,
      id: chatId === "new" ? undefined : chatId,
      isFirstMessage: chatId !== "new" && messagesToUse.length === 0,
    },
    onError: (error) => {
      console.error("useChat Hook Error", error, {
        chatId,
        selectedModel: selectedModel,
        reasoningLevel: state.reasoningLevel,
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

      // Handle image generation complete annotation
      const imageGenerationAnnotation = message.annotations?.find(
        (a) =>
          typeof a === "object" &&
          a !== null &&
          !Array.isArray(a) &&
          (a as { type?: unknown }).type === "image_generation_complete"
      );

      if (imageGenerationAnnotation) {
        const annotationData = (
          imageGenerationAnnotation as {
            data?: {
              filePart?: NonNullable<Message["parts"]>[number];
              databaseId?: string;
              content?: string;
            };
          }
        ).data;
        if (annotationData?.filePart && annotationData?.databaseId) {
          setMessages((currentMessages: Message[]) =>
            currentMessages.map((msg) => {
              if (msg.id === message.id) {
                const newParts: Message["parts"] = [
                  { type: "text", text: annotationData.content ?? "" },
                  annotationData.filePart as NonNullable<Message["parts"]>[number],
                ];
                return {
                  ...msg,
                  id: annotationData.databaseId ?? "",
                  content: annotationData.content ?? "",
                  parts: newParts,
                };
              }
              return msg;
            })
          );
        }
      }

      // Handle message saved annotation
      const messageSavedAnnotation = message.annotations?.find(
        (a) =>
          typeof a === "object" &&
          a !== null &&
          !Array.isArray(a) &&
          (a as { type?: unknown }).type === "message_saved"
      );

      if (messageSavedAnnotation) {
        const data = (messageSavedAnnotation as { data?: unknown }).data;
        if (
          typeof data === "object" &&
          data !== null &&
          "databaseId" in data &&
          typeof (data as { databaseId?: unknown }).databaseId === "string"
        ) {
          const databaseId = (data as { databaseId: string }).databaseId;

          if (message.id !== databaseId) {
            setMessages((currentMessages) =>
              currentMessages.map((msg) =>
                msg.id === message.id ? { ...msg, id: databaseId } : msg
              )
            );
          }
        }
      }

      // Handle title generated annotation
      const titleGeneratedAnnotation = message.annotations?.find(
        (a) =>
          typeof a === "object" &&
          a !== null &&
          !Array.isArray(a) &&
          (a as { type?: unknown }).type === "title_generated"
      );

      let generatedTitle: string | null = null;
      let annotationUserId: string | null = null;

      if (titleGeneratedAnnotation) {
        const data = (titleGeneratedAnnotation as { data?: unknown }).data;

        if (
          typeof data === "object" &&
          data !== null &&
          "sessionId" in data &&
          "title" in data &&
          "userId" in data &&
          typeof (data as { sessionId?: unknown }).sessionId === "string" &&
          typeof (data as { title?: unknown }).title === "string" &&
          typeof (data as { userId?: unknown }).userId === "string"
        ) {
          const { sessionId, title, userId } = data as {
            sessionId: string;
            title: string;
            userId: string;
          };

          if (sessionId === chatId) {
            generatedTitle = title;
            annotationUserId = userId;
            console.log("Title generated for session:", title);
          }
        }
      }

      // Handle existing chat session updates and refresh sidebar
      if (chatId && chatId !== "new" && generatedTitle && annotationUserId) {
        const sessionUpdate: ChatSession = {
          id: chatId,
          title: generatedTitle,
          updated_at: new Date().toISOString(),
        } as ChatSession;

        updateSessionInCache(sessionUpdate, annotationUserId);
      }

      // Always invalidate messages to get fresh data
      if (chatId && chatId !== "new") {
        invalidateMessages();
      }
    },
  });

  const handleStop = useCallback(() => {
    // Stop the stream first - this is synchronous and immediate
    stop();

    // Process saving and stream cancellation in parallel (fire-and-forget)
    const lastAssistantMessage = messages.filter((m) => m.role === "assistant").at(-1);

    // Save partial message (non-blocking)
    if (lastAssistantMessage && chatId !== "new" && user) {
      console.log("Saving partial message due to user stop:", lastAssistantMessage);

      // Convert message content and parts to database format
      const parts: MessagePart[] = [];

      // Add text content if available
      const textContent =
        typeof lastAssistantMessage.content === "string" ? lastAssistantMessage.content.trim() : "";
      if (textContent) {
        parts.push({ type: "text", text: textContent });
      }

      // Add parts from message.parts if available
      if (lastAssistantMessage.parts?.length) {
        for (const part of lastAssistantMessage.parts) {
          if (
            part.type === "text" &&
            "text" in part &&
            part.text &&
            !parts.some((p) => p.type === "text" && p.text === part.text)
          ) {
            parts.push({ type: "text", text: part.text });
          } else if (part.type === "file" && "url" in part) {
            const filePart = part as unknown as {
              url: string;
              mimeType: string;
              filename?: string;
              path?: string;
            };
            parts.push({
              type: "file",
              file: {
                name: filePart.filename || "file",
                path: filePart.path || "",
                url: filePart.url,
                size: 0,
                mimeType: filePart.mimeType,
              },
            });
          }
        }
      }

      // Save the partial message if we have content (fire-and-forget)
      if (parts.length > 0) {
        saveAssistantMessage(
          lastAssistantMessage.id,
          chatId,
          user.id,
          parts,
          selectedModel,
          "Assistant", // modelProvider - we can get this from model config if needed
          { reasoningLevel: state.reasoningLevel, searchEnabled: state.searchEnabled },
          {},
          { fireAndForget: true }
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
  }, [stop, chatId, messages, user, selectedModel, state.reasoningLevel, state.searchEnabled]);

  // Retry the last request after an error
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
    if (chatId !== "new" && !isLoadingMessages) {
      // Small delay to allow messages to render before scrolling
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [chatId, isLoadingMessages, scrollToBottom]);

  // Handle pending first message from sessionStorage for new sessions
  useEffect(() => {
    if (chatId === "new") return;

    const pendingMessageData = sessionStorage.getItem("pendingFirstMessage");
    if (!pendingMessageData) return;

    try {
      const { message, chatRequestOptions } = JSON.parse(pendingMessageData);

      // Clear the pending message
      sessionStorage.removeItem("pendingFirstMessage");

      // Submit the pending message with the isFirstMessage flag
      append(message, chatRequestOptions);
      setInput("");
      updateState({ attachedFiles: [] });
    } catch (error) {
      console.error("Failed to process pending message:", error);
      sessionStorage.removeItem("pendingFirstMessage");
    }
  }, [chatId, append, setInput, updateState]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleRetryMessage = useCallback(
    async (messageId: string) => {
      try {
        updateState({ uiError: null });
        stop(); // Stop any ongoing requests first

        const retryIndex = messages.findIndex((m) => m.id === messageId);
        if (retryIndex === -1) {
          console.error("Retry failed: message not found", { messageId });
          updateState({ uiError: "Message to retry not found." });
          return;
        }

        const messageToRetry = messages[retryIndex];
        if (!messageToRetry) {
          // This case should theoretically not be hit if retryIndex is valid
          console.error("Retry failed: message object not found", { messageId });
          updateState({ uiError: "Message to retry not found." });
          return;
        }

        if (messageToRetry.role !== "user") {
          updateState({ uiError: "Only user messages can be retried." });
          return;
        }

        if (chatId && chatId !== "new") {
          await deleteFromPoint(messageId);
          invalidateMessages();
        }

        // Remove the message and everything after it
        setMessages((currentMessages) => currentMessages.slice(0, retryIndex));

        append(messageToRetry);
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

  useEffect(() => {
    updateState({ showScrollToBottom });
  }, [showScrollToBottom, updateState]);

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
          reasoningLevel: state.reasoningLevel,
          searchEnabled: state.searchEnabled,
        };
        sessionStorage.setItem("pendingFirstMessage", JSON.stringify(messageData));

        const newSession = await createSession(user.id, "New Chat");
        updateSessionInCache(newSession, user.id);
        transferModelSelection("new", newSession.id);
        router.push(`/chat/${newSession.id}`);
        setTimeout(() => scrollToBottom(), 100);
      } catch (error) {
        console.error("Failed to create new session:", error);
        updateState({ uiError: "Failed to create new chat. Please try again." });
      }
    },
    [
      user,
      updateState,
      selectedModel,
      state.reasoningLevel,
      state.searchEnabled,
      updateSessionInCache,
      transferModelSelection,
      router,
      scrollToBottom,
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
      setTimeout(() => scrollToBottom(), 100);
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
        messagesEndRef={messagesEndRef}
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
        reasoningLevel={state.reasoningLevel}
        searchEnabled={state.searchEnabled}
        showScrollToBottom={state.showScrollToBottom}
        chatId={chatId}
        onSubmit={handleFormSubmit}
        onKeyDown={handleKeyDown}
        onModelChange={handleModelChange}
        onReasoningLevelChange={(level) => updateState({ reasoningLevel: level })}
        onSearchToggle={(enabled) => updateState({ searchEnabled: enabled })}
        onFileAttach={handleFileAttach}
        onRemoveFile={handleRemoveFile}
        onScrollToBottom={scrollToBottom}
        onStop={handleStop}
        onClearUiError={() => updateState({ uiError: null })}
        ref={chatInputRef}
      />
    </div>
  );
});

ChatWindow.displayName = "ChatWindow";

export default ChatWindow;
