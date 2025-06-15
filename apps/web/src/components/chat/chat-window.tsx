"use client";

import { useChatMessages } from "@/hooks/queries/use-chat-messages";
import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { useAutoResume } from "@/hooks/use-auto-resume";
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

const ChatWindow = memo(({ chatId, initialMessages = [] }: ChatWindowProps) => {
  const { state, updateState, selectedModel } = useChatState(chatId);
  const { transferModelSelection } = useModelSelectorStore();
  const router = useRouter();
  const [forceFocus, setForceFocus] = useState(false);

  const {
    messages: queryMessages,
    isLoading: isLoadingMessages,
    invalidateMessages,
  } = useChatMessages(chatId);
  const { invalidateSessions, updateSessionInCache } = useChatSessions();

  const messagesToUse =
    chatId !== "new" && queryMessages.length > 0 ? queryMessages : initialMessages;

  const { messagesContainerRef, messagesEndRef, showScrollToBottom, scrollToBottom } =
    useScrollManagement(messagesToUse.length);

  const { handleFileAttach, handleRemoveFile, handleForkChat, handleModelChange } = useChatHandlers(
    chatId,
    updateState
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
    data,
    experimental_resume,
  } = useChat({
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
      if (process.env.NODE_ENV === "development") {
        console.log(`Chat API Response - Status: ${response.status}`, {
          chatId,
          selectedModel: selectedModel,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url,
          timestamp: new Date().toISOString(),
        });
      }

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
        const annotationData = (imageGenerationAnnotation as { data?: any }).data;
        if (annotationData?.filePart && annotationData?.databaseId) {
          setMessages((currentMessages) =>
            currentMessages.map((msg) => {
              if (msg.id === message.id) {
                const newParts: Message["parts"] = [
                  { type: "text", text: annotationData.content },
                  annotationData.filePart,
                ];
                return {
                  ...msg,
                  id: annotationData.databaseId,
                  content: annotationData.content,
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

      if (chatId && chatId !== "new") {
        invalidateMessages();
      }

      // Handle existing chat session updates
      if (chatId && chatId !== "new") {
        // Update existing chat session
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

  useAutoResume({
    autoResume: chatId !== "new",
    initialMessages: messagesToUse,
    experimental_resume,
    data,
    setMessages,
  });

  // Handle pending first message from sessionStorage for new sessions
  useEffect(() => {
    if (chatId === "new") return;

    const pendingMessageData = sessionStorage.getItem("pendingFirstMessage");
    if (!pendingMessageData) return;

    try {
      const { message, chatRequestOptions } = JSON.parse(pendingMessageData);

      // Clear the pending message
      sessionStorage.removeItem("pendingFirstMessage");

      // Submit the pending message
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
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const messageToRetry = messages[messageIndex];
      if (!messageToRetry) return;

      const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

      try {
        if (chatId && chatId !== "new") {
          const supabase = (await import("@/utils/supabase/client")).createClient();

          const { error: deleteError } = await supabase.rpc("delete_messages_after", {
            p_message_id: messageId,
          });

          if (deleteError) {
            console.error("Database delete error:", deleteError);
            updateState({ uiError: "Failed to retry message. Please try again." });
            return;
          }

          invalidateMessages();
        }

        const messagesUpToRetryPoint = messages.slice(0, messageIndex);
        setMessages(messagesUpToRetryPoint);

        await delay(50);

        if (messageToRetry.role === "user") {
          const userMessageToResubmit = {
            id: messageToRetry.id,
            role: "user" as const,
            content: messageToRetry.content,
            ...(messageToRetry.parts && { parts: messageToRetry.parts }),
            ...(messageToRetry.experimental_attachments && {
              experimental_attachments: messageToRetry.experimental_attachments,
            }),
          };
          append(userMessageToResubmit);
        } else {
          reload();
        }

        updateState({ uiError: null });
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

  useEffect(() => {
    updateState({ showScrollToBottom });
  }, [showScrollToBottom, updateState]);

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

      if (attachments.length > 0 && process.env.NODE_ENV === "development") {
        console.log(
          "Frontend attachments being sent:",
          JSON.stringify(chatRequestOptions.experimental_attachments, null, 2)
        );
      }

      // If this is a new chat, create the session immediately and redirect
      if (chatId === "new") {
        try {
          // Store the message and attachments in sessionStorage for the new session
          const messageData = {
            message: messageToAppend,
            chatRequestOptions,
            selectedModel: selectedModel,
            reasoningLevel: state.reasoningLevel,
            searchEnabled: state.searchEnabled,
          };
          sessionStorage.setItem("pendingFirstMessage", JSON.stringify(messageData));

          // Create new session via API
          const response = await fetch("/api/chat/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: selectedModel,
              reasoningLevel: state.reasoningLevel,
              searchEnabled: state.searchEnabled,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to create session");
          }

          const { sessionId } = await response.json();

          // Transfer model selection to new session
          transferModelSelection("new", sessionId);

          // Redirect immediately to the new session
          router.push(`/chat/${sessionId}`);
          return;
        } catch (error) {
          console.error("Failed to create new session:", error);
          updateState({ uiError: "Failed to create new chat. Please try again." });
          return;
        }
      }

      append(messageToAppend, chatRequestOptions);
      setInput("");
      updateState({ attachedFiles: [] });
      setForceFocus(true);
    },
    [
      append,
      state.attachedFiles,
      input,
      setInput,
      updateState,
      chatId,
      selectedModel,
      state.reasoningLevel,
      state.searchEnabled,
      transferModelSelection,
      router,
    ]
  );

  useEffect(() => {
    if (forceFocus) {
      chatInputRef.current?.focus();
      setForceFocus(false);
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
        onRetry={reload}
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
