"use client";

import { useChat } from "@ai-sdk/react";
import {
  ChevronDownIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Textarea,
} from "@heroui/react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { FileAttachment } from "./file-attachment";
import MessageBubble from "./message-bubble";

interface ChatWindowProps {
  chatId: string;
}

const models = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
];

const ChatWindow = memo(({ chatId }: ChatWindowProps) => {
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const body = useMemo(() => ({ model: selectedModel }), [selectedModel]);

  const { messages, input, setInput, handleSubmit, status, stop, reload, error } = useChat({
    api: "/api/chat",
    id: chatId,
    body: body,
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  // Memoize expensive computations
  const selectedModelName = useMemo(() => {
    return models.find((m) => m.id === selectedModel)?.name || "GPT-4o";
  }, [selectedModel]);

  const canSubmit = useMemo(() => {
    return (input.trim().length > 0 || attachedFiles.length > 0) && !isLoading;
  }, [input, attachedFiles.length, isLoading]);

  // Memoize messages to prevent unnecessary re-renders
  const messageElements = useMemo(() => {
    return messages.map((message) => {
      return (
        <div key={message.id} className="w-full overflow-hidden">
          <MessageBubble message={message} onRetry={handleRetryMessage} onFork={handleForkChat} />
        </div>
      );
    });
  }, [messages, handleRetryMessage, handleForkChat]);

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 overflow-x-hidden px-4 py-6 pt-8">
          {messageElements}

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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileAttach}
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
          />

          {/* Form */}
          <form onSubmit={handleFormSubmit}>
            <Textarea
              value={input}
              onValueChange={setInput}
              placeholder="Type your message here..."
              variant="flat"
              minRows={1}
              maxRows={8}
              classNames={{
                base: "w-full",
                inputWrapper:
                  "bg-content2 border-default-200 border rounded-2xl p-3 data-[hover=true]:bg-content2 group-data-[focus=true]:bg-content2",
                input: "text-sm resize-none",
              }}
              onKeyDown={handleKeyDown}
              isDisabled={isLoading}
              endContent={
                <div className="flex items-center gap-2">
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        variant="flat"
                        size="sm"
                        color="primary"
                        className="h-8 px-3"
                        endContent={<ChevronDownIcon className="h-3 w-3" />}
                      >
                        {selectedModelName}
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                      selectedKeys={[selectedModel]}
                      selectionMode="single"
                      onSelectionChange={(keys) => {
                        const selectedKey = Array.from(keys)[0] as string;
                        setSelectedModel(selectedKey);
                      }}
                    >
                      {models.map((model) => (
                        <DropdownItem key={model.id}>{model.name}</DropdownItem>
                      ))}
                    </DropdownMenu>
                  </Dropdown>

                  <Button variant="flat" size="sm" className="h-8 px-3">
                    Medium
                  </Button>

                  <Button variant="flat" size="sm" className="h-8 px-3">
                    Search
                  </Button>

                  <Button
                    variant="flat"
                    size="sm"
                    isIconOnly
                    className="h-8 w-8"
                    onPress={() => fileInputRef.current?.click()}
                  >
                    <PaperClipIcon className="h-4 w-4" />
                  </Button>

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
              }
            />
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
