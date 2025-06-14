"use client";

import { type ReasoningLevel } from "@/config/models";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { Button, Textarea } from "@heroui/react";
import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { FileAttachment } from "./file-attachment";
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
  showScrollToBottom: boolean;
  chatId: string;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onModelChange: (model: string) => void;
  onReasoningLevelChange: (level: ReasoningLevel) => void;
  onSearchToggle: (enabled: boolean) => void;
  onFileAttach: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onScrollToBottom: () => void;
  onStop: () => void;
  onClearUiError: () => void;
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
        showScrollToBottom,
        chatId,
        onSubmit,
        onKeyDown,
        onModelChange,
        onReasoningLevelChange,
        onSearchToggle,
        onFileAttach,
        onRemoveFile,
        onScrollToBottom,
        onStop,
        onClearUiError,
      },
      ref
    ) => {
      const textareaRef = useRef<HTMLTextAreaElement>(null);

      useImperativeHandle(ref, () => ({
        focus: () => {
          textareaRef.current?.focus();
        },
      }));

      return (
        <div className="px-4" suppressHydrationWarning>
          <div className="relative mx-auto max-w-3xl">
            <ScrollToBottomButton
              showScrollToBottom={showScrollToBottom}
              onScrollToBottom={onScrollToBottom}
            />

            {attachedFiles.length > 0 && (
              <div className="rounded-t-2xl border-l border-r border-t border-default-200 bg-content2 p-4">
                <FileAttachment files={attachedFiles} onRemove={onRemoveFile} />
              </div>
            )}

            <form onSubmit={onSubmit}>
              <div
                className={`relative w-full border-l border-r border-t border-default-200 bg-content2 p-4 ${
                  attachedFiles.length > 0 ? "rounded-b-2xl border-t-0" : "rounded-t-2xl"
                }`}
              >
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onValueChange={(value) => {
                    setInput(value);
                    onClearUiError();
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
                  onKeyDown={onKeyDown}
                  isDisabled={isLoading}
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

                  <div className="flex-shrink-0">
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
      );
    }
  )
);

ChatInput.displayName = "ChatInput";
