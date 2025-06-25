"use client";

import { type ReasoningLevel } from "@/config/models";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useAuth } from "@/hooks/useAuth";
import { Button, Textarea } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { FileAttachment } from "./file-attachment";
import { MicButton } from "./mic-button";
import { ModelControls } from "./model-controls";
import { ModelSelector } from "./model-selector";
import { ScrollToBottomButton } from "./scroll-to-bottom-button";
import { type AttachedFileWithUrl } from "./utils/file-utils";

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  canSubmit: boolean;
  attachedFiles: AttachedFileWithUrl[];
  selectedModel: string;
  reasoningLevel: ReasoningLevel;
  searchEnabled: boolean;
  chatId: string;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onModelChange: (model: string) => void;
  onReasoningLevelChange: (level: ReasoningLevel) => void;
  onSearchToggle: (enabled: boolean) => void;
  onFileAttach: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDrop: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onStop: () => void;
  onClearUiError: () => void;
  onPromptSelect?: (prompt: string) => void;
  showScrollToBottom?: boolean;
  onScrollToBottom?: () => void;
}

export interface ChatInputRef {
  focus: () => void;
}

export const ChatInput = memo(
  forwardRef<ChatInputRef, ChatInputProps>(
    (
      {
        input,
        setInput,
        isLoading,
        canSubmit,
        attachedFiles,
        selectedModel,
        reasoningLevel,
        searchEnabled,
        chatId,
        onSubmit,
        onKeyDown,
        onModelChange,
        onReasoningLevelChange,
        onSearchToggle,
        onFileAttach,
        onFileDrop,
        onRemoveFile,
        onStop,
        onClearUiError,
        showScrollToBottom = false,
        onScrollToBottom,
      },
      ref
    ) => {
      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const [isDragging, setIsDragging] = useState(false);
      const dropZoneRef = useRef<HTMLDivElement>(null);
      const { isRecording, isProcessingSpeech, startRecording, stopRecording } =
        useSpeechRecognition();
      const { user } = useAuth();
      const router = useRouter();

      useImperativeHandle(ref, () => ({
        focus: () => {
          textareaRef.current?.focus();
        },
      }));

      const handleFocus = useCallback(() => {
        if (!user) {
          router.push("/auth/login");
        }
      }, [user, router]);

      const handleValueChange = useCallback(
        (value: string) => {
          setInput(value);
          onClearUiError();
        },
        [setInput, onClearUiError]
      );

      const handleStopRecording = useCallback(async () => {
        const transcribedText = await stopRecording();
        if (transcribedText) {
          setInput(input + transcribedText);
        }
      }, [stopRecording, setInput, input]);

      useEffect(() => {
        const handleDocumentDragEnter = (e: DragEvent) => {
          // Only show drag overlay if files are being dragged
          if (e.dataTransfer?.types.includes("Files")) {
            setIsDragging(true);
          }
        };

        const handleDocumentDragLeave = (e: DragEvent) => {
          // Only hide overlay if we're leaving the document entirely
          // or moving to an element that's not related to our drop zone
          if (
            !e.relatedTarget ||
            (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node))
          ) {
            setIsDragging(false);
          }
        };

        const handleDocumentDrop = () => {
          setIsDragging(false);
        };

        const handleDocumentDragOver = (e: DragEvent) => {
          e.preventDefault(); // Prevent default to allow drop
        };

        document.addEventListener("dragenter", handleDocumentDragEnter);
        document.addEventListener("dragleave", handleDocumentDragLeave);
        document.addEventListener("drop", handleDocumentDrop);
        document.addEventListener("dragover", handleDocumentDragOver);

        return () => {
          document.removeEventListener("dragenter", handleDocumentDragEnter);
          document.removeEventListener("dragleave", handleDocumentDragLeave);
          document.removeEventListener("drop", handleDocumentDrop);
          document.removeEventListener("dragover", handleDocumentDragOver);
        };
      }, []);

      const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
      }, []);

      const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);

          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) {
            onFileDrop(files);
          }
        },
        [onFileDrop]
      );

      return (
        <div className="px-4" suppressHydrationWarning>
          <div
            ref={dropZoneRef}
            className="relative mx-auto max-w-3xl"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {showScrollToBottom && onScrollToBottom && (
              <ScrollToBottomButton
                showScrollToBottom={showScrollToBottom}
                onScrollToBottom={onScrollToBottom}
              />
            )}

            {attachedFiles.length > 0 && (
              <div className="rounded-t-2xl border-l border-r border-t border-default-200 bg-content2 p-4">
                <FileAttachment files={attachedFiles} onRemove={onRemoveFile} />
              </div>
            )}

            <form onSubmit={onSubmit}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`relative overflow-hidden border-l border-r border-default-200 bg-content1 px-2 pt-2 ${
                  attachedFiles.length > 0 ? "border-b border-t-0" : "rounded-t-2xl border-t"
                }`}
              >
                <AnimatePresence>
                  {isDragging && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute inset-0 z-10 flex items-center justify-center rounded-t-2xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm"
                    >
                      <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        className="flex flex-col items-center gap-3 px-4 text-center"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <ArrowRight className="h-5 w-5 rotate-90 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-base font-semibold text-primary">
                            Drop files here
                          </div>
                          <div className="text-xs text-primary/70">Release to attach</div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div
                  className={`relative w-full rounded-t-2xl border-l border-r border-t border-primary/10 bg-content2 pb-5 pl-4 pr-4 pt-5 ${
                    attachedFiles.length > 0 ? "border-t-0" : ""
                  }`}
                >
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onValueChange={handleValueChange}
                    placeholder="Type your message here..."
                    variant="flat"
                    minRows={2}
                    maxRows={8}
                    classNames={{
                      base: "w-full",
                      inputWrapper:
                        "!bg-transparent border-0 p-0 shadow-none !outline-none !ring-0 !ring-offset-0",
                      input:
                        "text-sm resize-none focus:outline-none border-transparent focus:border-transparent focus:ring-0 !outline-none",
                    }}
                    onKeyDown={onKeyDown}
                    onFocus={handleFocus}
                  />

                  <div className="flex items-center justify-between gap-2 pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <ModelSelector
                        value={selectedModel}
                        onValueChange={onModelChange}
                        chatId={chatId}
                      />
                      <ModelControls
                        selectedModel={selectedModel}
                        reasoningLevel={reasoningLevel}
                        onReasoningLevelChange={onReasoningLevelChange}
                        searchEnabled={searchEnabled}
                        onSearchToggle={onSearchToggle}
                        onFileAttach={onFileAttach}
                        isLoading={isLoading}
                      />
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-2">
                      {isLoading ? (
                        <Button
                          onPress={onStop}
                          isIconOnly
                          color="danger"
                          size="sm"
                          className="h-8 w-8"
                        >
                          <div className="h-3 w-3 rounded-sm bg-current" />
                        </Button>
                      ) : (
                        <>
                          <MicButton
                            isRecording={isRecording}
                            isProcessingSpeech={isProcessingSpeech}
                            startRecording={startRecording}
                            stopRecording={handleStopRecording}
                            hasText={input.trim().length > 0}
                          />
                          <Button
                            type="submit"
                            isDisabled={!canSubmit}
                            isIconOnly
                            color="primary"
                            size="sm"
                            className="h-8 w-8"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </form>
          </div>
        </div>
      );
    }
  )
);

ChatInput.displayName = "ChatInput";
