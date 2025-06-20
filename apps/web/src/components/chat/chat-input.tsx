"use client";

import { type ReasoningLevel } from "@/config/models";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { Button, Textarea } from "@heroui/react";
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

            {attachedFiles.length > 0 && (
              <div className="rounded-t-2xl border-l border-r border-t border-default-200 bg-content2 p-4">
                <FileAttachment files={attachedFiles} onRemove={onRemoveFile} />
              </div>
            )}

            <form onSubmit={onSubmit}>
              <div
                className={`relative w-full border-l border-r border-t border-default-200 bg-content2 pb-4 pl-4 pr-4 pt-4 ${
                  attachedFiles.length > 0 ? "rounded-b-2xl border-t-0" : "rounded-t-2xl"
                }`}
              >
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onValueChange={handleValueChange}
                  placeholder="Type your message here..."
                  variant="flat"
                  minRows={1}
                  maxRows={8}
                  classNames={{
                    base: "w-full",
                    inputWrapper:
                      "!bg-transparent border-0 p-0 shadow-none focus-within:ring-0 focus:ring-0 focus-visible:ring-0 group-data-[focus-visible=true]:ring-0 group-data-[focus-visible=true]:ring-offset-0 data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0 !outline-none",
                    input:
                      "text-sm resize-none focus:outline-none border-transparent focus:border-transparent focus:ring-0 !outline-none",
                  }}
                  onKeyDown={onKeyDown}
                />

                <div className="flex items-center justify-between gap-2 pt-2">
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
            </form>
          </div>
        </div>
      );
    }
  )
);

ChatInput.displayName = "ChatInput";
