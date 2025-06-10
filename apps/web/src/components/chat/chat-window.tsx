"use client";

import { DEFAULT_MODEL, type ReasoningLevel } from "@/config/models";
import { useChat } from "@ai-sdk/react";
import { PaperAirplaneIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button, Textarea } from "@heroui/react";
import { memo, useCallback, useState } from "react";
import { FileAttachment } from "./file-attachment";
import MessageBubble from "./message-bubble";
import { ModelControls } from "./model-controls";
import { ModelSelector } from "./model-selector";

interface ChatWindowProps {
  chatId: string;
}

const ChatWindow = memo(({ chatId }: ChatWindowProps) => {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [reasoningLevel, setReasoningLevel] = useState<ReasoningLevel>("medium");
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const { messages, input, setInput, handleSubmit, status, stop, reload, error } = useChat({
    api: "/api/chat",
    id: chatId,
    body: {
      model: selectedModel,
      reasoningLevel,
      searchEnabled,
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Memoize callback functions to prevent child re-renders
  const handleRetryMessage = useCallback(() => {
    reload();
  }, [reload]);

  const handleForkChat = useCallback((messageId: string) => {
    console.log("Fork chat from message:", messageId);
  }, []);

  const handleFileAttach = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachedFiles((prev) => [...prev, ...files]);
    // Clear the input value to allow selecting the same file again
    event.target.value = "";
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!input.trim() && attachedFiles.length === 0) return;

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

      // Clear attachments after sending
      setAttachedFiles([]);
    },
    [attachedFiles, handleSubmit, input]
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

  const canSubmit = (input.trim().length > 0 || attachedFiles.length > 0) && !isLoading;

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 overflow-x-hidden px-4 py-6 pt-8">
          {messages.map((message) => (
            <div key={message.id} className="w-full overflow-hidden">
              <MessageBubble
                message={message}
                onRetry={handleRetryMessage}
                onFork={handleForkChat}
              />
            </div>
          ))}

          {/* Chat-level streaming indicator */}
          {isLoading && (
            <div className="mx-auto max-w-3xl px-4">
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
      <div className="p-4">
        <div className="mx-auto max-w-3xl">
          {/* Form */}
          <form onSubmit={handleFormSubmit}>
            <div className="relative w-full rounded-2xl border border-default-200 bg-content2 p-3">
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
                  <ModelSelector value={selectedModel} onValueChange={setSelectedModel} />
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
