"use client";

import { type ReasoningLevel } from "@/config/models";
import { useChatScroll } from "@/hooks";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useChat } from "@ai-sdk/react";
import { ArrowDownIcon, PaperAirplaneIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button, Textarea } from "@heroui/react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileAttachment } from "./file-attachment";
import MessageBubble from "./message-bubble";
import { ModelControls } from "./model-controls";
import { ModelSelector } from "./model-selector";

interface ChatWindowProps {
  chatId: string;
}

const ChatWindow = memo(({ chatId }: ChatWindowProps) => {
  const { selectedModel } = useModelSelectorStore();
  const [reasoningLevel, setReasoningLevel] = useState<ReasoningLevel>("medium");
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const router = useRouter();

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { messages, input, setInput, handleSubmit, status, stop, reload, error, append } = useChat({
    api: "/api/chat",
    id: chatId,
    body: {
      model: selectedModel,
      reasoningLevel,
      searchEnabled,
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  const messagesEndRef = useChatScroll(messages.length);

  // Check for pending message on component mount (for redirected chats)
  useEffect(() => {
    if (chatId !== "main") {
      const pendingMessageKey = `pending-message-${chatId}`;
      const pendingMessageData = sessionStorage.getItem(pendingMessageKey);

      if (pendingMessageData) {
        try {
          const messageData = JSON.parse(pendingMessageData);

          // Set the model settings
          setReasoningLevel(messageData.reasoningLevel);
          setSearchEnabled(messageData.searchEnabled);

          // Clear the pending message from storage
          sessionStorage.removeItem(pendingMessageKey);

          // Send the message directly using append
          if (messageData.input) {
            append({
              role: "user",
              content: messageData.input,
            });
          }
        } catch (error) {
          console.error("Failed to parse pending message:", error);
          sessionStorage.removeItem(pendingMessageKey);
        }
      }
    }
  }, [chatId, append]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const threshold = 200;
    const isScrolledUp =
      container.scrollHeight - container.scrollTop - container.clientHeight > threshold;
    setShowScrollToBottom(isScrolledUp);
  }, []);

  // Stable scroll listener setup
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Improved manual scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const element = messagesEndRef.current;
    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate random chat ID
  const generateChatId = useCallback(() => {
    return Math.random().toString(36).substring(2, 15);
  }, []);

  // Stable callback functions
  const handleRetryMessage = useCallback(() => {
    reload();
  }, [reload]);

  const handleForkChat = useCallback((messageId: string) => {
    console.log("Fork chat from message:", messageId);
  }, []);

  const handleFileAttach = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachedFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!input.trim() && attachedFiles.length === 0) return;

      // If we're on the main chat and this is the first message, navigate to a specific chat
      if (chatId === "main" && messages.length === 0) {
        const newChatId = generateChatId();

        // Store the message data in sessionStorage before redirecting
        const messageData = {
          input: input.trim(),
          attachedFiles: attachedFiles.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
          model: selectedModel,
          reasoningLevel,
          searchEnabled,
        };

        sessionStorage.setItem(`pending-message-${newChatId}`, JSON.stringify(messageData));
        router.push(`/chat/${newChatId}`);
        return;
      }

      const fileList =
        attachedFiles.length > 0
          ? ({
              length: attachedFiles.length,
              item: (index: number) => attachedFiles[index] || null,
              [Symbol.iterator]: () => attachedFiles[Symbol.iterator](),
            } as FileList)
          : undefined;

      handleSubmit(e, {
        experimental_attachments: fileList,
      });

      setAttachedFiles([]);

      // Auto-scroll on form submit - this will trigger via messagesEndRef hook
      // when messages.length changes, providing better UX
    },
    [
      attachedFiles,
      handleSubmit,
      input,
      chatId,
      messages.length,
      generateChatId,
      router,
      selectedModel,
      reasoningLevel,
      searchEnabled,
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

  // Memoize computed values
  const canSubmit = useMemo(
    () => (input.trim().length > 0 || attachedFiles.length > 0) && !isLoading,
    [input, attachedFiles.length, isLoading]
  );

  // Memoize the scroll to bottom button
  const scrollToBottomButton = useMemo(() => {
    if (!showScrollToBottom) return null;

    return (
      <div className="absolute -top-12 left-1/2 z-10 -translate-x-1/2">
        <Button
          isIconOnly
          size="sm"
          radius="full"
          className="bg-content1/80 shadow-md backdrop-blur-md"
          onPress={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <ArrowDownIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  }, [showScrollToBottom, scrollToBottom]);

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
          {messages.map((message) => (
            <div key={message.id} className="w-full max-w-full">
              <MessageBubble
                message={message}
                onRetry={handleRetryMessage}
                onFork={handleForkChat}
              />
            </div>
          ))}

          {/* Chat-level streaming indicator */}
          {isLoading && (
            <div className="w-full max-w-full overflow-hidden">
              <div className="flex gap-4">
                <div className="flex max-w-[75%] flex-col items-start gap-2">
                  <div className="rounded-xl bg-content2 px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-1 animate-pulse rounded-full bg-current opacity-60" />
                      <div className="h-1 w-1 animate-pulse rounded-full bg-current opacity-60 delay-100" />
                      <div className="h-1 w-1 animate-pulse rounded-full bg-current opacity-60 delay-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Auto-scroll target - this ref automatically scrolls when messages change */}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 rounded-lg border border-danger bg-danger/10 p-3 text-danger">
          <p className="text-xs">Error: {error.message}</p>
          <Button size="sm" color="danger" variant="flat" onPress={() => reload()} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* File Attachments */}
      {attachedFiles.length > 0 && (
        <div className="border-t border-divider px-4 py-3">
          <FileAttachment files={attachedFiles} onRemove={handleRemoveFile} />
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 pb-0 pt-4" suppressHydrationWarning>
        <div className="relative mx-auto max-w-3xl">
          {/* Scroll to Bottom Button */}
          {scrollToBottomButton}

          {/* Form */}
          <form onSubmit={handleFormSubmit}>
            <div className="relative w-full rounded-t-2xl border border-b-0 border-default-200 bg-content2 p-3">
              {/* Textarea */}
              <Textarea
                value={input}
                onValueChange={setInput}
                placeholder="Type your message here..."
                variant="flat"
                minRows={1}
                maxRows={8}
                classNames={{
                  base: "w-full",
                  inputWrapper: "!bg-transparent border-0 p-0 shadow-none",
                  input: "text-sm resize-none",
                }}
                onKeyDown={handleKeyDown}
                isDisabled={isLoading}
              />

              {/* Controls Row */}
              <div className="flex items-center justify-between gap-2 pt-2">
                {/* Left side - Model Controls (includes attachment) */}
                <div className="flex items-center gap-2">
                  <ModelSelector />
                  <ModelControls
                    selectedModel={selectedModel}
                    reasoningLevel={reasoningLevel}
                    onReasoningLevelChange={setReasoningLevel}
                    searchEnabled={searchEnabled}
                    onSearchToggle={setSearchEnabled}
                    onFileAttach={handleFileAttach}
                    isLoading={isLoading}
                  />
                </div>

                {/* Right side - Send/Stop Button */}
                <div className="flex-shrink-0">
                  {isLoading ? (
                    <Button onPress={stop} isIconOnly color="danger" size="sm" className="h-8 w-8">
                      <div className="h-3 w-3 rounded-sm bg-current" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      isDisabled={!canSubmit}
                      isIconOnly
                      color="primary"
                      size="sm"
                      className="h-8 w-8"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Floating New Chat Button (Mobile) */}
      <Button
        className="fixed bottom-6 right-6 z-50 lg:hidden"
        isIconOnly
        color="primary"
        size="lg"
        radius="full"
      >
        <PlusIcon className="h-7 w-7" />
      </Button>
    </div>
  );
});

ChatWindow.displayName = "ChatWindow";

export default ChatWindow;
