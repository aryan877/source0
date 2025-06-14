"use client";

import { useChatMessages } from "@/hooks/queries/use-chat-messages";
import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { useChatHandlers } from "@/hooks/use-chat-handlers";
import { useChatState } from "@/hooks/use-chat-state";
import { useScrollManagement } from "@/hooks/use-scroll-management";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useChat, type Message } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo } from "react";
import { ChatInput } from "./chat-input";
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
  const { messages, input, setInput, status, stop, error, append } = useChat({
    api: "/api/chat",
    id: chatId === "new" ? undefined : chatId,
    initialMessages: messagesToUse,
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

      const messageToAppend: Message = {
        id: `temp-id-${Math.random()}`,
        role: "user",
        content: input.trim(),
        parts: [...textPart, ...fileParts] as Message["parts"],
      };

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
    },
    [append, state.attachedFiles, input, setInput, updateState]
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

  // Computed values
  const canSubmit = useMemo(
    () => (input.trim().length > 0 || state.attachedFiles.length > 0) && !isLoading,
    [input, state.attachedFiles.length, isLoading]
  );

  return (
    <div className="flex h-full flex-col">
      <MessagesList
        messages={messages}
        isLoading={isLoading}
        isLoadingMessages={isLoadingMessages}
        chatId={chatId}
        onForkChat={handleForkChat}
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
      />
    </div>
  );
});

ChatWindow.displayName = "ChatWindow";

export default ChatWindow;
