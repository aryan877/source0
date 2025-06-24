"use client";

import { type ReasoningLevel } from "@/config/models";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { Button, Textarea } from "@heroui/react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { forwardRef, memo, useCallback, useImperativeHandle, useRef } from "react";
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
        onRemoveFile,
        onStop,
        onClearUiError,
        showScrollToBottom = false,
        onScrollToBottom,
      },
      ref
    ) => {
      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const { isRecording, isProcessingSpeech, startRecording, stopRecording } =
        useSpeechRecognition();

      useImperativeHandle(ref, () => ({
        focus: () => {
          textareaRef.current?.focus();
        },
      }));

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

      return (
        <div className="px-4" suppressHydrationWarning>
          <div className="relative mx-auto max-w-3xl">
            {showScrollToBottom && onScrollToBottom && (
              <ScrollToBottomButton
                showScrollToBottom={showScrollToBottom}
                onScrollToBottom={onScrollToBottom}
              />
            )}

            <form onSubmit={onSubmit}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative overflow-hidden rounded-2xl border border-default-200 bg-content1 shadow-sm"
              >
                {attachedFiles.length > 0 && (
                  <div className="border-b border-default-200 bg-content1 p-4">
                    <FileAttachment files={attachedFiles} onRemove={onRemoveFile} />
                  </div>
                )}

                <div className="relative w-full bg-content1 px-4 py-4">
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
                  />

                  <div className="flex items-center justify-between gap-2 pt-4">
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
