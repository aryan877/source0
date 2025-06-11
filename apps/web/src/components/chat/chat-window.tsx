"use client";

import { type ReasoningLevel } from "@/config/models";
import { useChatScroll } from "@/hooks";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { uploadFiles, type UploadResult } from "@/utils/supabase/storage";
import { useChat } from "@ai-sdk/react";
import { ArrowDownIcon, PaperAirplaneIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Progress, Textarea } from "@heroui/react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileAttachment } from "./file-attachment";
import MessageBubble from "./message-bubble";
import { ModelControls } from "./model-controls";
import { ModelSelector } from "./model-selector";

interface ChatWindowProps {
  chatId: string;
}

interface AttachedFileWithUrl {
  file: File;
  uploadResult?: UploadResult;
  uploading?: boolean;
  error?: string;
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

const ChatWindow = memo(({ chatId }: ChatWindowProps) => {
  const { selectedModel } = useModelSelectorStore();
  const [reasoningLevel, setReasoningLevel] = useState<ReasoningLevel>("medium");
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileWithUrl[]>([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uiError, setUiError] = useState<string | null>(null);
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
    // Enhanced error handling with comprehensive logging
    onError: (error) => {
      logError(error, "useChat Hook Error", {
        chatId,
        selectedModel,
        reasoningLevel,
        searchEnabled,
        messageCount: messages.length,
        status,
        input: input?.substring(0, 100), // Log first 100 chars of input for debugging
        attachedFilesCount: attachedFiles.length,
      });
    },
    // Log successful responses for debugging
    onResponse: (response) => {
      if (process.env.NODE_ENV === "development") {
        console.log(`📡 Chat API Response - Status: ${response.status}`, {
          chatId,
          selectedModel,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url,
          timestamp: new Date().toISOString(),
        });
      }

      // Log non-ok responses as potential issues
      if (!response.ok) {
        logError(
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          "API Response Error",
          {
            chatId,
            selectedModel,
            status: response.status,
            statusText: response.statusText,
            url: response.url,
          }
        );
      }
    },
    // Log when streaming finishes
    onFinish: (message, { usage, finishReason }) => {
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Chat stream finished", {
          chatId,
          selectedModel,
          messageId: message.id,
          messageLength: message.content?.length,
          usage,
          finishReason,
          timestamp: new Date().toISOString(),
        });
      }

      // Log potential issues with finish reasons
      if (finishReason === "error") {
        logError(new Error("Stream finished with error reason"), "Stream Finish Error", {
          chatId,
          selectedModel,
          messageId: message.id,
          finishReason,
          usage,
        });
      }

      if (finishReason === "length") {
        console.warn("⚠️ Stream finished due to length limit", {
          chatId,
          selectedModel,
          messageId: message.id,
          messageLength: message.content?.length,
          usage,
        });
      }
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
          logError(
            error instanceof Error ? error : new Error("Unknown error parsing pending message"),
            "Pending Message Parse Error",
            {
              chatId,
              pendingMessageData: pendingMessageData?.substring(0, 200), // Log first 200 chars
            }
          );
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
    try {
      if (uiError) setUiError(null);
      reload();
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown retry error");
      logError(err, "Message Retry Error", { chatId, selectedModel });
      setUiError(`Failed to retry message: ${err.message}`);
    }
  }, [reload, chatId, selectedModel, uiError]);

  const handleForkChat = useCallback((messageId: string) => {
    console.log("Fork chat from message:", messageId);
  }, []);

  // Upload files to Supabase storage
  const uploadFilesToStorage = useCallback(
    async (files: File[]) => {
      setUiError(null);
      setUploadProgress(0);

      try {
        const { successful, failed } = await uploadFiles(files, `chat-${chatId}`);

        if (failed.length > 0) {
          const failedFileNames = failed.map((f) => f.file.name).join(", ");
          const errorMessage = `Failed to upload: ${failedFileNames}. ${failed[0]?.error ?? ""}`;
          setUiError(errorMessage);

          failed.forEach((failure) => {
            logError(new Error(`File upload failed: ${failure.error}`), "File Upload Error", {
              chatId,
              fileName: failure.file.name,
              uploadError: failure.error,
            });
          });
        }

        setUploadProgress(100);

        return { successful, failed };
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown upload error");
        logError(err, "File Upload System Error", {
          chatId,
          fileCount: files.length,
          fileNames: files.map((f) => f.name),
        });
        setUiError(`An unexpected error occurred during upload: ${err.message}`);
        return { successful: [], failed: files.map((file) => ({ file, error: "Upload failed" })) };
      }
    },
    [chatId]
  );

  const handleFileAttach = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      if (files.length === 0) return;

      // Add files to state immediately with uploading status
      const newAttachedFiles: AttachedFileWithUrl[] = files.map((file) => ({
        file,
        uploading: true,
      }));

      setAttachedFiles((prev) => [...prev, ...newAttachedFiles]);
      event.target.value = "";

      // Upload files to Supabase
      const { successful, failed } = await uploadFilesToStorage(files);

      // Update state with upload results
      setAttachedFiles((prev) => {
        const updated = [...prev];
        let successIndex = 0;
        let failedIndex = 0;

        // Find the files we just added and update them
        for (let i = updated.length - files.length; i < updated.length; i++) {
          const currentFile = updated[i];
          if (currentFile && currentFile.uploading) {
            if (successIndex < successful.length) {
              updated[i] = {
                file: currentFile.file,
                uploadResult: successful[successIndex],
                uploading: false,
              };
              successIndex++;
            } else if (failedIndex < failed.length) {
              const failedResult = failed[failedIndex];
              updated[i] = {
                file: currentFile.file,
                error: failedResult ? failedResult.error : "Upload failed",
                uploading: false,
              };
              failedIndex++;
            }
          }
        }

        return updated;
      });
    },
    [uploadFilesToStorage]
  );

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setUiError(null);

      if (!input.trim() && attachedFiles.length === 0) return;

      // Check if any files are still uploading
      const stillUploading = attachedFiles.some((file) => file.uploading);
      if (stillUploading) {
        setUiError("Please wait for files to finish uploading.");
        return;
      }

      // Check if any files failed to upload
      const failedFiles = attachedFiles.filter((file) => file.error);
      if (failedFiles.length > 0) {
        setUiError("Some files failed to upload. Please remove them or try again.");
        return;
      }

      try {
        // If we're on the main chat and this is the first message, navigate to a specific chat
        if (chatId === "main" && messages.length === 0) {
          const newChatId = generateChatId();

          // Store the message data in sessionStorage before redirecting
          const messageData = {
            input: input.trim(),
            attachedFiles: attachedFiles.map((fileWithUrl) => ({
              name: fileWithUrl.file.name,
              size: fileWithUrl.file.size,
              type: fileWithUrl.file.type,
              url: fileWithUrl.uploadResult?.url,
              path: fileWithUrl.uploadResult?.path,
            })),
            model: selectedModel,
            reasoningLevel,
            searchEnabled,
          };

          sessionStorage.setItem(`pending-message-${newChatId}`, JSON.stringify(messageData));
          router.push(`/chat/${newChatId}`);
          return;
        }

        // Create attachments array from uploaded files
        const attachments = attachedFiles
          .filter((fileWithUrl) => fileWithUrl.uploadResult)
          .map((fileWithUrl) => ({
            name: fileWithUrl.file.name,
            contentType: fileWithUrl.file.type,
            url: fileWithUrl.uploadResult!.url,
          }));

        const messageOptions =
          attachments.length > 0 ? { experimental_attachments: attachments } : {};

        handleSubmit(e, messageOptions);
        setAttachedFiles([]);
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown form submit error");
        logError(err, "Form Submit Error", {
          chatId,
          selectedModel,
          inputLength: input.length,
          attachedFilesCount: attachedFiles.length,
          hasAttachments: attachedFiles.length > 0,
        });
        setUiError(`Failed to send message: ${err.message}`);
      }
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
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 lg:px-4">
          {messages.map((message) => (
            <div key={message.id} className="w-full max-w-full">
              <MessageBubble
                message={message}
                onRetry={handleRetryMessage}
                onFork={handleForkChat}
                isLoading={isLoading}
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
                      {[0, 1, 2].map((index) => (
                        <motion.div
                          key={index}
                          className="h-1 w-1 rounded-full bg-current"
                          animate={{
                            opacity: [0.3, 1, 0.3],
                            scale: [1, 1.2, 1],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: index * 0.2,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {(error || uiError) && (
            <div className="w-full max-w-full">
              <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="h-2 w-2 flex-shrink-0 rounded-full bg-danger" />
                      <p className="text-sm font-medium text-danger">
                        {error ? "Connection Error" : "Notice"}
                      </p>
                    </div>

                    {error && (
                      <p className="mb-2 text-xs leading-relaxed text-danger/80">{error.message}</p>
                    )}
                    {uiError && (
                      <p className="mb-2 text-xs leading-relaxed text-danger/80">{uiError}</p>
                    )}

                    {error && (
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={handleRetryMessage}
                        className="h-7 px-3 text-xs"
                      >
                        Retry
                      </Button>
                    )}
                  </div>

                  {uiError && !error && (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => setUiError(null)}
                      aria-label="Dismiss error"
                      className="h-6 w-6 min-w-0 flex-shrink-0"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Auto-scroll target - this ref automatically scrolls when messages change */}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="px-4 py-2">
          <Progress value={uploadProgress} className="mx-auto max-w-3xl" />
        </div>
      )}

      {/* File Attachments */}
      {attachedFiles.length > 0 && (
        <div className="border-t border-divider px-4 py-3">
          <div className="mx-auto max-w-3xl">
            <FileAttachment files={attachedFiles.map((f) => f.file)} onRemove={handleRemoveFile} />
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 pb-4 pt-4" suppressHydrationWarning>
        <div className="relative mx-auto max-w-3xl">
          {/* Scroll to Bottom Button */}
          {scrollToBottomButton}

          {/* Form */}
          <form onSubmit={handleFormSubmit}>
            <div className="relative w-full rounded-2xl border border-default-200 bg-content2 p-3">
              {/* Textarea */}
              <Textarea
                value={input}
                onValueChange={(value) => {
                  setInput(value);
                  if (uiError) setUiError(null);
                }}
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
                <div className="flex flex-wrap items-center gap-2">
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
    </div>
  );
});

ChatWindow.displayName = "ChatWindow";

export default ChatWindow;
