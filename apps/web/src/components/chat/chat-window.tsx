"use client";

import { useChatMessages } from "@/hooks/queries/use-chat-messages";
import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { useChatHandlers } from "@/hooks/use-chat-handlers";
import { useChatState } from "@/hooks/use-chat-state";
import { useScrollManagement } from "@/hooks/use-scroll-management";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useChat, type Message } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatInput, type ChatInputRef } from "./chat-input";
import { MessagesList } from "./messages-list";

interface ChatWindowProps {
  chatId: string;
  initialMessages?: Message[];
}

const logError = (error: Error, context: string, data: Record<string, unknown> = {}) => {
  const isDevelopment = process.env.NODE_ENV === "development";
  console.error(`🚨 [Chat Error - ${context}]`, {
    error: {
      message: error.message,
      name: error.name,
      stack: isDevelopment ? error.stack : undefined,
    },
    ...data,
  });
};

const ChatWindow = memo(({ chatId, initialMessages = [] }: ChatWindowProps) => {
  const { state, updateState, selectedModel } = useChatState(chatId);
  const { transferModelSelection } = useModelSelectorStore();
  const router = useRouter();
  const [forceFocus, setForceFocus] = useState(false);

  // React Query hooks
  const {
    messages: queryMessages,
    isLoading: isLoadingMessages,
    invalidateMessages,
  } = useChatMessages(chatId);
  const { invalidateSessions, updateSessionInCache } = useChatSessions();

  // Determine messages to use
  const messagesToUse =
    chatId !== "new" && queryMessages.length > 0 ? queryMessages : initialMessages;

  // Scroll management
  const { messagesContainerRef, messagesEndRef, showScrollToBottom, scrollToBottom } =
    useScrollManagement(messagesToUse.length);

  // Chat handlers
  const { handleFileAttach, handleRemoveFile, handleForkChat, handleModelChange } = useChatHandlers(
    chatId,
    updateState
  );

  // AI SDK Chat hook
  const { messages, input, setInput, status, stop, error, append, reload, setMessages } = useChat({
    api: "/api/chat",
    id: chatId === "new" ? undefined : chatId,
    initialMessages: messagesToUse,
    sendExtraMessageFields: true,
    generateId: () => uuidv4(),
    body: {
      model: selectedModel,
      reasoningLevel: state.reasoningLevel,
      searchEnabled: state.searchEnabled,
      id: chatId === "new" ? undefined : chatId,
    },
    onError: (error) => {
      logError(error, "useChat Hook Error", {
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
      if (process.env.NODE_ENV === "development") {
        console.log(`📡 Chat API Response - Status: ${response.status}`, {
          chatId,
          selectedModel: selectedModel,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url,
          timestamp: new Date().toISOString(),
        });
      }

      if (!response.ok) {
        logError(
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          "API Response Error",
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
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Chat stream finished", {
          chatId,
          selectedModel: selectedModel,
          messageId: message.id,
          finishReason,
          usage,
          timestamp: new Date().toISOString(),
        });
      }

      // Check for message saved annotation containing database ID
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
          console.log(
            "🎯 Message saved to database with ID:",
            databaseId,
            "Frontend ID:",
            message.id
          );

          // Update the message ID to match the database ID
          if (message.id !== databaseId) {
            console.log("🔄 Updating frontend message ID to match database ID");
            setMessages((currentMessages) =>
              currentMessages.map((msg) =>
                msg.id === message.id ? { ...msg, id: databaseId } : msg
              )
            );
          }
        }
      }

      // Invalidate the messages for the current chat to refetch from DB
      if (chatId && chatId !== "new") {
        invalidateMessages();
      }

      // Check if a new session was created and update the session list optimistically
      const newSessionAnnotation = message.annotations?.find(
        (a) =>
          typeof a === "object" &&
          a !== null &&
          !Array.isArray(a) &&
          (a as { type?: unknown }).type === "new_session"
      );

      if (newSessionAnnotation) {
        const data = (newSessionAnnotation as { data?: unknown }).data;
        if (
          typeof data === "object" &&
          data !== null &&
          "sessionId" in data &&
          typeof (data as { sessionId?: unknown }).sessionId === "string"
        ) {
          const newSessionId = (data as { sessionId: string }).sessionId;

          // Transfer model selection from "new" to the actual session ID
          if (chatId === "new") {
            transferModelSelection("new", newSessionId);
          }

          // Fetch the new session and add it to the cache
          const supabase = (await import("@/utils/supabase/client")).createClient();
          const newSession = await (
            await import("@/utils/supabase/db")
          ).getChatSession(supabase, newSessionId);

          if (newSession) {
            updateSessionInCache(newSession);
          } else {
            // Fallback to invalidation if fetching fails
            invalidateSessions();
          }
          // Redirect to the new session
          router.push(`/chat/${newSessionId}`);
        }
      } else if (chatId && chatId !== "new") {
        // This was an existing chat, so fetch its updated state and update cache
        const supabase = (await import("@/utils/supabase/client")).createClient();
        const updatedSession = await (
          await import("@/utils/supabase/db")
        ).getChatSession(supabase, chatId);

        if (updatedSession) {
          updateSessionInCache(updatedSession);
        } else {
          invalidateSessions();
        }
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Retry/Regenerate handler for messages
  const handleRetryMessage = useCallback(
    async (messageId: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const messageToRetry = messages[messageIndex];
      if (!messageToRetry) return;

      // A small helper to introduce a delay
      const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

      try {
        // First, delete messages from database after the retry point
        if (chatId && chatId !== "new") {
          const supabase = (await import("@/utils/supabase/client")).createClient();

          console.log("🔄 Deleting messages after:", messageId);

          // Call the delete_messages_after function to clear subsequent messages
          const { error: deleteError } = await supabase.rpc("delete_messages_after", {
            p_message_id: messageId,
          });

          if (deleteError) {
            console.error("Database delete error:", deleteError);
            updateState({ uiError: "Failed to retry message. Please try again." });
            return;
          }

          // Invalidate messages to refetch from database, but don't block
          invalidateMessages();
        }

        // Truncate local messages to the retry point (excluding the message being retried)
        const messagesUpToRetryPoint = messages.slice(0, messageIndex);
        setMessages(messagesUpToRetryPoint);

        // A short delay to allow React state to update before proceeding
        await delay(50);

        // If it's a user message, re-append it and generate AI response
        if (messageToRetry.role === "user") {
          // Re-append the user message with original ID preserved
          const userMessageToResubmit = {
            id: messageToRetry.id, // Keep original ID for sync
            role: "user" as const,
            content: messageToRetry.content,
            ...(messageToRetry.parts && { parts: messageToRetry.parts }),
            ...(messageToRetry.experimental_attachments && {
              experimental_attachments: messageToRetry.experimental_attachments,
            }),
          };
          append(userMessageToResubmit);
        } else {
          // If it's an AI message, use reload to regenerate
          reload();
        }

        updateState({ uiError: null });
      } catch (error) {
        console.error("Error during message retry:", error);
        updateState({
          uiError: "Failed to retry message. Please try again.",
        });
        // Invalidate messages to restore the original state
        if (chatId && chatId !== "new") {
          invalidateMessages();
        }
      }
    },
    [
      messages,
      setMessages,
      reload,
      append,
      chatId,
      selectedModel,
      state.reasoningLevel,
      state.searchEnabled,
      invalidateMessages,
      updateState,
    ]
  );

  // Update scroll state
  useEffect(() => {
    updateState({ showScrollToBottom });
  }, [showScrollToBottom, updateState]);

  // Form submission handler
  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
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
        updateState({ uiError: "Some files failed to upload. Please remove them or try again." });
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
          : {};

      if (attachments.length > 0) {
        console.log(
          "📎 Frontend attachments being sent:",
          JSON.stringify(chatRequestOptions.experimental_attachments, null, 2)
        );
      }

      append(messageToAppend, chatRequestOptions);
      setInput("");
      updateState({ attachedFiles: [] });

      // Trigger the focus effect
      setForceFocus(true);
    },
    [append, state.attachedFiles, input, setInput, updateState]
  );

  useEffect(() => {
    if (forceFocus) {
      chatInputRef.current?.focus();
      setForceFocus(false); // Reset the trigger
    }
  }, [forceFocus]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleFormSubmit(e as React.FormEvent);
      }
    },
    [handleFormSubmit]
  );

  // Computed values
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
        onForkChat={handleForkChat}
        onRetryMessage={handleRetryMessage}
        messagesContainerRef={messagesContainerRef}
        messagesEndRef={messagesEndRef}
        error={error}
        uiError={state.uiError}
        onDismissUiError={() => updateState({ uiError: null })}
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
        onStop={stop}
        onClearUiError={() => updateState({ uiError: null })}
        ref={chatInputRef}
      />
    </div>
  );
});

ChatWindow.displayName = "ChatWindow";

export default ChatWindow;
