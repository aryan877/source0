"use client";

import {
  ArrowPathIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  CpuChipIcon,
  LinkIcon,
  UserIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { Avatar, Button, Tooltip } from "@heroui/react";
import type { UIMessage } from "ai";
import Image from "next/image";
import { memo, useCallback, useMemo, useState } from "react";
import { useReasoningSpinner } from "../../hooks/use-reasoning-spinner";
import { ExpandableSection } from "./expandable-section";
import { MessageContent } from "./message-content";
import { SecureFileDisplay } from "./secure-file-display";

interface MessageBubbleProps {
  message: UIMessage;
  onRetry: (messageId: string) => void;
  onFork: (messageId: string) => void;
  isLoading?: boolean;
}

const MessageBubble = memo(
  ({ message, onRetry, onFork, isLoading = false }: MessageBubbleProps) => {
    const [showActions, setShowActions] = useState(false);
    const [copied, setCopied] = useState(false);
    const isUser = message.role === "user";

    const { isReasoningStreaming } = useReasoningSpinner({
      message,
      isLoading,
    });

    // Stable callbacks with proper dependencies
    const handleCopy = useCallback(async () => {
      if (message.content) {
        try {
          await navigator.clipboard.writeText(message.content);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (error) {
          console.error("Failed to copy:", error);
        }
      }
    }, [message.content]);

    const handleRetry = useCallback(() => {
      onRetry(message.id);
    }, [onRetry, message.id]);

    const handleFork = useCallback(() => {
      onFork(message.id);
    }, [onFork, message.id]);

    // Render message parts using the AI SDK's built-in parts system
    const renderMessageParts = useMemo(() => {
      // Always use parts - no fallback needed for modern implementation
      if (!message.parts?.length) {
        return null;
      }

      return message.parts.map((part, index) => {
        switch (part.type) {
          case "text":
            return (
              <div key={index}>
                <MessageContent content={part.text} />
              </div>
            );

          case "file":
            // Handle file parts (including images) with secure URLs
            // For base64 data, use it directly; for URLs, try to generate fresh signed URLs
            if (part.data) {
              // File has base64 data - use it directly
              if (part.mimeType.startsWith("image/")) {
                return (
                  <div
                    key={index}
                    className="mb-4 max-w-md overflow-hidden rounded-xl border border-divider shadow-lg transition-transform hover:scale-105"
                  >
                    <Image
                      src={`data:${part.mimeType};base64,${part.data}`}
                      alt="Attached image"
                      width={500}
                      height={350}
                      className="h-auto w-full rounded-xl object-cover"
                      unoptimized
                    />
                  </div>
                );
              } else {
                return (
                  <div
                    key={index}
                    className="mb-4 flex items-center gap-4 rounded-xl border border-divider bg-gradient-to-r from-content1 to-content1/80 p-4 shadow-sm transition-all hover:scale-105 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-content2 text-xl shadow-sm">
                      📎
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-foreground">File attachment</span>
                      <span className="text-sm text-default-500">{part.mimeType}</span>
                    </div>
                  </div>
                );
              }
            } else {
              // File might be a URL reference - use SecureFileDisplay for potential signed URL generation
              return (
                <SecureFileDisplay
                  key={index}
                  fallbackUrl={`data:${part.mimeType};base64,${part.data || ""}`}
                  mimeType={part.mimeType}
                  isImage={part.mimeType.startsWith("image/")}
                />
              );
            }

          case "tool-invocation": {
            // Handle tool invocations with expandable section
            const toolInvocation = part.toolInvocation;
            const toolName = toolInvocation.toolName || "Unknown Tool";
            const isComplete = toolInvocation.state === "result";

            return (
              <ExpandableSection
                key={index}
                title={`${toolName} ${isComplete ? "✓" : "..."}`}
                icon={<WrenchScrewdriverIcon className="h-4 w-4" />}
                variant="tool"
              >
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground/80">
                      <div className="h-1 w-1 rounded-full bg-current opacity-60"></div>
                      Tool Call
                    </h4>
                    <div className="rounded-lg border border-divider/30 bg-content1/60 p-3 shadow-sm">
                      <code className="font-mono text-sm font-medium text-foreground/80">
                        {toolName}
                      </code>
                    </div>
                  </div>

                  {toolInvocation.args && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground/80">
                        <div className="h-1 w-1 rounded-full bg-current opacity-60"></div>
                        Arguments
                      </h4>
                      <div className="rounded-lg border border-divider/30 bg-content1/60 p-3 shadow-sm">
                        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/80">
                          {JSON.stringify(toolInvocation.args, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {isComplete && "result" in toolInvocation && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground/80">
                        <div className="h-1 w-1 rounded-full bg-current opacity-60"></div>
                        Result
                      </h4>
                      <div className="rounded-lg border border-divider/30 bg-content1/60 p-3 shadow-sm">
                        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/80">
                          {typeof toolInvocation.result === "string"
                            ? toolInvocation.result
                            : JSON.stringify(toolInvocation.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 border-t border-divider/20 pt-2">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ${
                        isComplete
                          ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                          : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                      }`}
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${isComplete ? "bg-success-500" : "bg-warning-500"}`}
                      ></div>
                      {isComplete ? "Completed" : "In Progress"}
                    </span>
                    {toolInvocation.step && (
                      <span className="text-xs font-medium text-foreground/60">
                        Step {toolInvocation.step}
                      </span>
                    )}
                  </div>
                </div>
              </ExpandableSection>
            );
          }

          case "reasoning":
            // Handle reasoning parts with minimal, clean display
            return (
              <ExpandableSection
                key={index}
                title="Reasoning"
                icon={<CpuChipIcon className="h-4 w-4" />}
                defaultExpanded={false}
                isLoading={isReasoningStreaming}
              >
                <MessageContent content={part.reasoning} />
              </ExpandableSection>
            );

          case "source": {
            // Handle source parts with expandable section
            const domain = new URL(part.source.url).hostname;
            return (
              <ExpandableSection
                key={index}
                title={part.source.title || domain}
                icon={<LinkIcon className="h-4 w-4" />}
                variant="source"
              >
                <div className="space-y-4">
                  <div>
                    <a
                      href={part.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span className="break-all">{part.source.url}</span>
                    </a>
                  </div>

                  {part.source.title && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground/80">
                        <div className="h-1 w-1 rounded-full bg-current opacity-60"></div>
                        Title
                      </h4>
                      <div className="rounded-lg border border-divider/30 bg-content1/60 p-3 shadow-sm">
                        <div className="text-sm font-medium text-foreground/80">
                          {part.source.title}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 border-t border-divider/20 pt-2">
                    <span className="text-xs font-medium text-foreground/60">Source:</span>
                    <span className="rounded bg-content2/50 px-2 py-1 font-mono text-xs text-foreground/70">
                      {domain}
                    </span>
                  </div>
                </div>
              </ExpandableSection>
            );
          }

          case "step-start":
            return null;

          default:
            return null;
        }
      });
    }, [message.parts, isReasoningStreaming]);

    // Memoize the action buttons to prevent re-renders
    const actionButtons = useMemo(() => {
      // Don't show actions when loading/streaming or for user messages
      if (isLoading || isUser) return null;

      return (
        <div
          className={`flex items-center gap-1 rounded-lg bg-content1/50 p-1 shadow-sm backdrop-blur-sm transition-opacity duration-200 ${showActions ? "opacity-100" : "opacity-0"}`}
        >
          <Tooltip content="Retry message" placement="top" delay={300}>
            <div>
              <Button
                variant="light"
                size="sm"
                isIconOnly
                onPress={handleRetry}
                className="transition-all hover:scale-105 hover:bg-content2"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </Button>
            </div>
          </Tooltip>

          <Tooltip content={copied ? "Copied!" : "Copy message"} placement="top" delay={300}>
            <div>
              <Button
                variant="light"
                size="sm"
                isIconOnly
                onPress={handleCopy}
                className="transition-all hover:scale-105 hover:bg-content2"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 text-success-500" />
                ) : (
                  <ClipboardDocumentIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </Tooltip>

          <Tooltip content="Fork from here" placement="top" delay={300}>
            <div>
              <Button
                variant="light"
                size="sm"
                isIconOnly
                onPress={handleFork}
                className="transition-all hover:scale-105 hover:bg-content2"
              >
                <CodeBracketIcon className="h-4 w-4" />
              </Button>
            </div>
          </Tooltip>
        </div>
      );
    }, [showActions, handleRetry, copied, handleCopy, handleFork, isLoading, isUser]);

    return (
      <div
        className={`group flex gap-6 ${isUser ? "flex-row-reverse" : "flex-row"} transition-all duration-200`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {isUser && (
          <div className="flex-shrink-0">
            <Avatar
              size="sm"
              name="U"
              getInitials={(name) => name}
              color="primary"
              fallback={<UserIcon className="h-5 w-5" />}
              className="shadow-md ring-2 ring-primary/20"
            />
          </div>
        )}

        <div
          className={`flex flex-col gap-3 ${
            isUser ? "ml-auto max-w-[85%] items-end" : "w-full items-start"
          }`}
        >
          <div className={`${isUser ? "rounded-2xl bg-content2 px-5 py-4" : "w-full px-1"}`}>
            {renderMessageParts}
          </div>

          {/* Action buttons positioned below the message content */}
          {actionButtons && <div className={`${isUser ? "mr-2" : "ml-2"}`}>{actionButtons}</div>}
        </div>
      </div>
    );
  }
);

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
