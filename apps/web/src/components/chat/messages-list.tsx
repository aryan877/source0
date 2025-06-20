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
import { StreamingIndicator } from "./streaming-indicator";
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
      <div className="flex max-w-[75%] flex-col items-start gap-4">
        {/* Header with generating indicator */}
        <div className="flex items-center">
          <div className="flex items-center gap-2 rounded-full border border-content2 bg-content2/60 px-4 py-2">
            <motion.div
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <svg
                className="h-4 w-4 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </motion.div>
            <span className="text-sm font-medium text-foreground/80">Generating image...</span>
          </div>
        </div>

        {/* Main image container with shimmer effect */}
        <div className="relative aspect-square w-64 overflow-hidden rounded-xl bg-gradient-to-br from-content2 to-content3 shadow-md">
          {/* Shimmer overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{
              x: [-300, 300],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Floating elements to indicate image generation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Central icon */}
              <motion.div
                className="relative z-10 rounded-full bg-primary/20 p-4"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.6, 0.8, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <svg
                  className="h-8 w-8 text-primary/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </motion.div>

              {/* Orbiting dots */}
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="absolute h-2 w-2 rounded-full bg-primary/40"
                  style={{
                    top: "50%",
                    left: "50%",
                    transformOrigin: "0 0",
                  }}
                  animate={{
                    rotate: [0, 360],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: index * 0.5,
                    ease: "easeInOut",
                  }}
                  initial={{
                    x: 40 * Math.cos((index * 2 * Math.PI) / 3),
                    y: 40 * Math.sin((index * 2 * Math.PI) / 3),
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Description loading bar with gradient */}
        <div className="space-y-2">
          <motion.div
            className="h-3 w-48 overflow-hidden rounded-lg bg-gradient-to-r from-content2 to-content3"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20"
              animate={{
                x: [-200, 200],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          <motion.div
            className="h-3 w-32 overflow-hidden rounded-lg bg-gradient-to-r from-content2 to-content3"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20"
              animate={{
                x: [-150, 150],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  </div>
));
ImageLoadingSkeleton.displayName = "ImageLoadingSkeleton";

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
  isBranching: boolean;
  onBranchOptionsToggle: (isOpen: boolean) => void;
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
    isBranching,
    onBranchOptionsToggle,
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
        className={`flex-1 overflow-y-auto ${isBranching ? "overflow-y-hidden" : ""}`}
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
                      onBranchOptionsToggle={onBranchOptionsToggle}
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
                    onBranchOptionsToggle={onBranchOptionsToggle}
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
