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
import { memo, useCallback, useMemo, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./code-block";

interface MessageBubbleProps {
  message: UIMessage;
  onRetry: (messageId: string) => void;
  onFork: (messageId: string) => void;
}

const MessageBubble = memo(({ message, onRetry, onFork }: MessageBubbleProps) => {
  const [showActions, setShowActions] = useState(false);
  const isUser = message.role === "user";
  const contentToRender = message.content;

  const handleCopy = useCallback(() => {
    if (message.content) {
      navigator.clipboard.writeText(message.content).catch(console.error);
    }
  }, [message.content]);

  const handleRetry = useCallback(() => {
    onRetry(message.id);
  }, [onRetry, message.id]);

  const handleFork = useCallback(() => {
    onFork(message.id);
  }, [onFork, message.id]);

  const markdownComponents = useMemo(
    () =>
      ({
        // Paragraphs
        p: ({ children }) => (
          <p
            className={`mb-2 break-words text-sm leading-relaxed last:mb-0 ${isUser ? "text-white" : "text-foreground"}`}
          >
            {children}
          </p>
        ),

        // Code blocks and inline code
        code: ({ className, children, ...props }) => {
          const isCodeBlock = className?.includes("language-");

          if (isCodeBlock) {
            return (
              <CodeBlock className={className} {...props}>
                {String(children).replace(/\n$/, "")}
              </CodeBlock>
            );
          }

          // Inline code
          return (
            <code
              className={`break-all rounded-md px-1 py-0.5 font-mono text-xs ${
                isUser
                  ? "border border-white/20 bg-white/20 text-white"
                  : "border border-default-200 bg-content3/50 text-foreground"
              }`}
              {...props}
            >
              {children}
            </code>
          );
        },

        // Pre blocks
        pre: ({ children }) => <>{children}</>,

        // Headings
        h1: ({ children }) => (
          <h1
            className={`mb-3 break-words text-lg font-bold ${isUser ? "text-white" : "text-foreground"}`}
          >
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2
            className={`mb-2 break-words text-base font-semibold ${isUser ? "text-white" : "text-foreground"}`}
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            className={`mb-2 break-words text-sm font-semibold ${isUser ? "text-white" : "text-foreground"}`}
          >
            {children}
          </h3>
        ),

        // Lists
        ul: ({ children }) => (
          <ul
            className={`mb-2 list-disc break-words pl-5 text-sm ${isUser ? "text-white" : "text-foreground"}`}
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            className={`mb-2 list-decimal break-words pl-5 text-sm ${isUser ? "text-white" : "text-foreground"}`}
          >
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className={`mb-1 break-words text-sm ${isUser ? "text-white" : "text-foreground"}`}>
            {children}
          </li>
        ),

        // Emphasis
        strong: ({ children }) => (
          <strong
            className={`break-words text-sm font-semibold ${isUser ? "text-white" : "text-foreground"}`}
          >
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em
            className={`break-words text-sm italic ${isUser ? "text-white/90" : "text-foreground/90"}`}
          >
            {children}
          </em>
        ),

        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote
            className={`break-words border-l-4 pl-3 text-sm italic ${
              isUser ? "border-white/30 text-white/90" : "border-default-300 text-foreground/90"
            }`}
          >
            {children}
          </blockquote>
        ),

        // Tables
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto">
            <table
              className={`min-w-full border-collapse border text-sm ${
                isUser ? "border-white/30" : "border-default-300"
              }`}
            >
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th
            className={`whitespace-nowrap border px-2 py-1 text-left text-xs font-semibold ${
              isUser
                ? "border-white/30 bg-white/10 text-white"
                : "border-default-300 bg-default-100 text-foreground"
            }`}
          >
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td
            className={`border px-2 py-1 text-sm ${
              isUser ? "border-white/30 text-white" : "border-default-300 text-foreground"
            }`}
          >
            {children}
          </td>
        ),

        // Links
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`break-all text-sm underline hover:no-underline ${
              isUser ? "text-white hover:text-white/80" : "text-primary hover:text-primary/80"
            }`}
          >
            {children}
          </a>
        ),
      }) satisfies Components,
    [isUser]
  );

  const renderAttachments = () => {
    if (!message.experimental_attachments?.length) return null;

    return (
      <div className="mb-4">
        {message.experimental_attachments.map((attachment, index) => {
          if (
            attachment.url?.startsWith("data:image/") ||
            attachment.contentType?.startsWith("image/")
          ) {
            return (
              <div key={index} className="mb-3 max-w-sm overflow-hidden rounded-lg">
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
            <div key={index} className="mb-3 flex items-center gap-3 rounded-xl bg-content1 p-3">
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
      {/* Avatar - only show for user messages */}
      {isUser && (
        <div className="flex-shrink-0">
          <Avatar
            size="sm"
            name="U"
            getInitials={(name) => name}
            color="primary"
            fallback={<UserIcon className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Message Content */}
      <div
        className={`flex flex-col gap-2 ${isUser ? "ml-auto max-w-[85%] items-end" : "w-full items-start"}`}
      >
        <div className={`${isUser ? "rounded-xl bg-primary px-6 py-4" : ""} w-full`}>
          {/* Experimental Attachments */}
          {renderAttachments()}

          {/* Message Text */}
          {contentToRender && (
            <div className={`break-words ${isUser ? "text-white" : "text-foreground"}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {contentToRender}
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

              <Tooltip content="Copy message" placement="top" delay={500}>
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
