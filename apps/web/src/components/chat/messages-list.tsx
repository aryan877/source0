"use client";

import { type Message } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo, useMemo } from "react";
import {
  type TypedImageErrorAnnotation,
  type TypedImagePendingAnnotation,
} from "../../types/annotations";
import { ErrorDisplay } from "./error-display";
import MessageBubble from "./message-bubble";
import { SuggestedQuestions } from "./suggested-questions";

const LoadingMessages = memo(() => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="flex gap-4">
          <div className="h-8 w-8 rounded-full bg-content3" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-content3" />
            <div className="h-4 w-1/2 rounded bg-content3" />
          </div>
        </div>
      </div>
    ))}
  </div>
));

LoadingMessages.displayName = "LoadingMessages";

const ImageLoadingSkeleton = memo(() => (
  <div className="w-full max-w-full overflow-hidden">
    <div className="flex gap-4">
      <div className="flex max-w-[75%] flex-col items-start gap-3">
        <div className="relative aspect-square w-64 animate-pulse rounded-xl bg-content3"></div>
        <div className="h-4 w-48 animate-pulse rounded-lg bg-content3"></div>
      </div>
    </div>
  </div>
));
ImageLoadingSkeleton.displayName = "ImageLoadingSkeleton";

const StreamingIndicator = memo(() => (
  <div className="w-full max-w-full overflow-hidden">
    <div className="flex gap-4">
      <div className="flex max-w-[75%] flex-col items-start gap-2">
        <div className="px-1 py-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="h-1 w-1 rounded-full bg-primary/60"
                  animate={{
                    opacity: [0.4, 1, 0.4],
                    scale: [1, 1.3, 1],
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
  </div>
));

StreamingIndicator.displayName = "StreamingIndicator";

interface MessagesListProps {
  messages: Message[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  chatId: string;
  onBranchChat: (messageId: string, modelId?: string) => void;
  onRetryMessage: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  error?: Error;
  uiError?: string | null;
  onDismissUiError: () => void;
  onRetry?: () => void;
  suggestedQuestions: string[];
  isLoadingQuestions: boolean;
  questionsError: string | null;
  onQuestionSelect: (question: string) => void;
  selectedModel: string;
}

export const MessagesList = memo(
  ({
    messages,
    isLoading,
    isLoadingMessages,
    chatId,
    onBranchChat,
    onRetryMessage,
    onEditMessage,
    messagesContainerRef,
    error,
    uiError,
    onDismissUiError,
    onRetry,
    suggestedQuestions,
    isLoadingQuestions,
    questionsError,
    onQuestionSelect,
  }: MessagesListProps) => {
    const containerStyle = useMemo(
      () => ({
        paddingBottom: "2rem", // Space for the chat input and some buffer
      }),
      []
    );

    const isStreamingText =
      isLoading &&
      !messages.some((m) =>
        m.annotations?.some(
          (a) =>
            typeof a === "object" &&
            a !== null &&
            (a as { type?: unknown }).type === "image_generation_pending"
        )
      );

    return (
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        data-messages-container="true"
      >
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8" style={containerStyle}>
          {isLoadingMessages && chatId !== "new" && messages.length === 0 ? (
            <LoadingMessages />
          ) : (
            messages.map((message, index) => {
              const hasImage = message.parts?.some(
                (p) => p.type === "file" && p.mimeType?.startsWith("image/")
              );

              if (hasImage) {
                return (
                  <div key={message.id} data-message-id={message.id} className="w-full max-w-full">
                    <MessageBubble
                      message={message}
                      onRetry={onRetryMessage}
                      onBranch={onBranchChat}
                      onEdit={onEditMessage}
                      isLoading={isLoading && index === messages.length - 1}
                      chatId={chatId}
                    />
                  </div>
                );
              }

              // Only check for pending/error annotations if no image is present.
              // Prioritize error display over pending state.
              const imageGenErrorAnnotation = message.annotations?.find(
                (a): a is TypedImageErrorAnnotation =>
                  typeof a === "object" &&
                  a !== null &&
                  (a as { type?: unknown }).type === "image_generation_error"
              );

              if (imageGenErrorAnnotation) {
                return (
                  <ErrorDisplay
                    key={`error-${message.id}`}
                    uiError={imageGenErrorAnnotation.data.error}
                    onDismissUiError={() => {
                      /* Cannot dismiss this error */
                    }}
                    isMessageError={true}
                  />
                );
              }

              const imageGenPendingAnnotation = message.annotations?.find(
                (a): a is TypedImagePendingAnnotation =>
                  typeof a === "object" &&
                  a !== null &&
                  (a as { type?: unknown }).type === "image_generation_pending"
              );

              if (imageGenPendingAnnotation) {
                return <ImageLoadingSkeleton key={`pending-${message.id}`} />;
              }

              // Default case: render a normal message bubble for text, tools, etc.
              return (
                <div key={message.id} data-message-id={message.id} className="w-full max-w-full">
                  <MessageBubble
                    message={message}
                    onRetry={onRetryMessage}
                    onBranch={onBranchChat}
                    onEdit={onEditMessage}
                    isLoading={isLoading && index === messages.length - 1}
                    chatId={chatId}
                  />
                </div>
              );
            })
          )}

          {isStreamingText && <StreamingIndicator />}

          <ErrorDisplay
            error={error}
            uiError={uiError}
            onDismissUiError={onDismissUiError}
            onRetry={onRetry}
          />

          {!isLoading && !isLoadingMessages && (
            <SuggestedQuestions
              questions={suggestedQuestions}
              isLoading={isLoadingQuestions}
              error={questionsError}
              onQuestionSelect={onQuestionSelect}
            />
          )}

          <div data-messages-end="true" />
        </div>
      </div>
    );
  }
);

MessagesList.displayName = "MessagesList";
