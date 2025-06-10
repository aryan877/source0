"use client";

import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { Avatar, Button, Tooltip } from "@heroui/react";
import type { UIMessage } from "ai";
import Image from "next/image";
import { memo, useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./code-block";

interface MessageBubbleProps {
  message: UIMessage;
  onRetry: (messageId: string) => void;
  onFork: (messageId: string) => void;
}

const MessageBubble = memo(({ message, onRetry, onFork }: MessageBubbleProps) => {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

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

  const renderAttachments = () => {
    if (!message.experimental_attachments?.length) return null;

    return (
      <div className="mb-4 space-y-3">
        {message.experimental_attachments.map((attachment, index) => {
          if (
            attachment.url?.startsWith("data:image/") ||
            attachment.contentType?.startsWith("image/")
          ) {
            return (
              <div key={index} className="max-w-sm overflow-hidden rounded-lg">
                <Image
                  src={attachment.url}
                  alt={attachment.name || "Image"}
                  width={400}
                  height={300}
                  className="h-auto w-full rounded-lg object-cover"
                  unoptimized
                />
              </div>
            );
          }

          return (
            <div key={index} className="flex items-center gap-3 rounded-xl bg-content1 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-content2 text-lg">
                📎
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {attachment.name || "Attachment"}
                </span>
                <span className="text-xs text-default-500">{attachment.contentType}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`group flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar - only for user */}
      {isUser && (
        <div className="flex-shrink-0">
          <Avatar
            size="sm"
            name="U"
            getInitials={(name) => name}
            color="primary"
            fallback={<UserIcon className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Message Content */}
      <div
        className={`flex flex-col gap-2 ${isUser ? "ml-auto max-w-[85%] items-end" : "w-full items-start"}`}
      >
        <div className={`${isUser ? "rounded-xl bg-primary px-4 py-3" : ""} w-full`}>
          {renderAttachments()}

          {message.content && (
            <div
              className={
                isUser
                  ? "prose prose-sm max-w-none prose-headings:text-white prose-p:text-white prose-strong:text-white prose-em:text-white/90 prose-code:text-white prose-pre:bg-white/10 prose-pre:text-white"
                  : "prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:leading-relaxed prose-p:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:text-foreground/80 prose-strong:text-foreground prose-em:text-foreground/80 prose-code:rounded prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none prose-pre:bg-content3 prose-pre:shadow-inner prose-ol:text-foreground prose-ul:text-foreground prose-li:text-foreground prose-li:marker:text-primary prose-table:text-sm prose-th:bg-content2 prose-th:font-medium prose-th:text-foreground prose-td:text-foreground prose-hr:border-divider"
              }
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: ({ className, children, ...props }) => {
                    const isCodeBlock = className?.includes("language-");

                    if (isCodeBlock) {
                      return (
                        <CodeBlock className={className} {...props}>
                          {String(children).replace(/\n$/, "")}
                        </CodeBlock>
                      );
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => <>{children}</>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-3 px-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          {!isUser && (
            <div
              className={`flex items-center gap-1 transition-opacity duration-200 ${
                showActions ? "opacity-100" : "opacity-0"
              }`}
            >
              <Tooltip content="Retry message" placement="top" delay={500}>
                <Button variant="light" size="sm" isIconOnly onPress={handleRetry}>
                  <ArrowPathIcon className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content={copied ? "Copied!" : "Copy message"} placement="top" delay={500}>
                <Button variant="light" size="sm" isIconOnly onPress={handleCopy}>
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Fork from here" placement="top" delay={500}>
                <Button variant="light" size="sm" isIconOnly onPress={handleFork}>
                  <CodeBracketIcon className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export { MessageBubble };
export default MessageBubble;
