"use client";

import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { Avatar, Button, Tooltip } from "@heroui/react";
import type { UIMessage } from "ai";
import "katex/dist/katex.min.css";
import Image from "next/image";
import React, { memo, useCallback, useMemo, useState } from "react";
import Lowlight from "react-lowlight";
import "react-lowlight/common";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

interface CodeBlockProps {
  children: string;
  className?: string;
}

const CodeBlock = memo(({ children, className }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);

  const { displayLanguage, highlightLanguage } = useMemo(() => {
    const originalLang = className?.replace("language-", "") || "text";
    const highlightLang = Lowlight.hasLanguage(originalLang) ? originalLang : "text";

    return {
      displayLanguage: originalLang,
      highlightLanguage: highlightLang,
    };
  }, [className]);

  const shouldShowLineNumbers = useMemo(() => {
    return children.split("\n").length > 1;
  }, [children]);

  // Stable copy handler
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [children]);

  // Stable wrap toggle handler
  const handleWrapToggle = useCallback(() => {
    setIsWrapped((prev) => !prev);
  }, []);

  // Memoize line numbers array - only recalculate when children or shouldShowLineNumbers changes
  const lineNumbers = useMemo(() => {
    if (!shouldShowLineNumbers) return null;

    const lines = children.split("\n");
    const totalLines = lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;

    return Array.from({ length: totalLines }, (_, index) => (
      <div
        key={index}
        className="flex h-6 items-center justify-end px-2 font-mono text-sm leading-6 text-default-500"
      >
        {index + 1}
      </div>
    ));
  }, [children, shouldShowLineNumbers]);

  // Memoize header controls to prevent re-renders
  const headerControls = useMemo(
    () => (
      <div className="flex items-center gap-1">
        <Tooltip content={isWrapped ? "Unwrap code" : "Wrap code"} placement="top" delay={300}>
          <Button
            size="sm"
            variant="light"
            isIconOnly
            onPress={handleWrapToggle}
            className={`h-6 w-6 transition-colors ${isWrapped ? "bg-content2" : ""}`}
            aria-pressed={isWrapped}
          >
            <ArrowsRightLeftIcon className="h-3 w-3" />
          </Button>
        </Tooltip>
        <Tooltip content={copied ? "Copied!" : "Copy"} placement="top" delay={300}>
          <Button size="sm" variant="light" isIconOnly onPress={handleCopy} className="h-6 w-6">
            {copied ? (
              <CheckIcon className="h-3 w-3 text-success" />
            ) : (
              <ClipboardDocumentIcon className="h-3 w-3" />
            )}
          </Button>
        </Tooltip>
      </div>
    ),
    [isWrapped, handleWrapToggle, copied, handleCopy]
  );

  // Memoize the syntax highlighting component to prevent unnecessary re-renders
  const syntaxHighlighting = useMemo(
    () => (
      <Lowlight
        language={highlightLanguage}
        value={children}
        inline={false}
        prefix="hljs-"
        markers={[]}
      />
    ),
    [highlightLanguage, children]
  );

  return (
    <div className="not-prose my-3 rounded-md border border-divider bg-content1">
      <div className="flex items-center justify-between border-b border-divider px-3 py-2">
        <span className="font-mono text-xs text-default-600">{displayLanguage}</span>
        {headerControls}
      </div>
      <div className={`${isWrapped ? "overflow-x-visible" : "overflow-x-auto"} px-3`}>
        <div className={`flex ${isWrapped ? "min-w-0" : "min-w-max"}`}>
          {shouldShowLineNumbers && (
            <div className="flex min-w-[2.5rem] flex-col border-r border-divider bg-default-50 py-3">
              {lineNumbers}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div
              className={`syntax-highlighting py-3 pl-3 font-mono text-sm leading-6 [&_.hljs-addition]:bg-green-100 [&_.hljs-addition]:text-green-600 [&_.hljs-addition]:dark:bg-green-900/30 [&_.hljs-addition]:dark:text-green-400 [&_.hljs-attr]:text-orange-600 [&_.hljs-attr]:dark:text-orange-400 [&_.hljs-attribute]:text-orange-600 [&_.hljs-attribute]:dark:text-orange-400 [&_.hljs-built_in]:text-purple-600 [&_.hljs-built_in]:dark:text-purple-400 [&_.hljs-class]:text-yellow-600 [&_.hljs-class]:dark:text-yellow-400 [&_.hljs-comment]:italic [&_.hljs-comment]:text-gray-500 [&_.hljs-comment]:dark:text-gray-400 [&_.hljs-deletion]:bg-red-100 [&_.hljs-deletion]:text-red-600 [&_.hljs-deletion]:dark:bg-red-900/30 [&_.hljs-deletion]:dark:text-red-400 [&_.hljs-doctag]:text-purple-600 [&_.hljs-doctag]:dark:text-purple-400 [&_.hljs-emphasis]:italic [&_.hljs-function]:font-semibold [&_.hljs-function]:text-blue-600 [&_.hljs-function]:dark:text-blue-400 [&_.hljs-keyword]:font-semibold [&_.hljs-keyword]:text-purple-600 [&_.hljs-keyword]:dark:text-purple-400 [&_.hljs-literal]:text-blue-600 [&_.hljs-literal]:dark:text-blue-400 [&_.hljs-meta]:text-gray-600 [&_.hljs-meta]:dark:text-gray-400 [&_.hljs-name]:text-red-600 [&_.hljs-name]:dark:text-red-400 [&_.hljs-number]:text-blue-600 [&_.hljs-number]:dark:text-blue-400 [&_.hljs-operator]:text-gray-700 [&_.hljs-operator]:dark:text-gray-300 [&_.hljs-punctuation]:text-gray-600 [&_.hljs-punctuation]:dark:text-gray-400 [&_.hljs-quote]:italic [&_.hljs-quote]:text-gray-500 [&_.hljs-quote]:dark:text-gray-400 [&_.hljs-regexp]:text-green-600 [&_.hljs-regexp]:dark:text-green-400 [&_.hljs-selector-class]:text-yellow-600 [&_.hljs-selector-class]:dark:text-yellow-400 [&_.hljs-selector-id]:text-blue-600 [&_.hljs-selector-id]:dark:text-blue-400 [&_.hljs-selector-tag]:text-red-600 [&_.hljs-selector-tag]:dark:text-red-400 [&_.hljs-string]:text-green-600 [&_.hljs-string]:dark:text-green-400 [&_.hljs-strong]:font-bold [&_.hljs-symbol]:text-indigo-600 [&_.hljs-symbol]:dark:text-indigo-400 [&_.hljs-tag]:text-red-600 [&_.hljs-tag]:dark:text-red-400 [&_.hljs-title]:font-semibold [&_.hljs-title]:text-blue-600 [&_.hljs-title]:dark:text-blue-400 [&_.hljs-type]:text-cyan-600 [&_.hljs-type]:dark:text-cyan-400 [&_.hljs-variable]:text-red-600 [&_.hljs-variable]:dark:text-red-400 [&_pre]:leading-6 ${
                isWrapped
                  ? "whitespace-pre-wrap [&>*]:whitespace-pre-wrap [&_code]:whitespace-pre-wrap [&_pre]:whitespace-pre-wrap"
                  : "whitespace-pre [&>*]:whitespace-pre [&_code]:whitespace-pre [&_pre]:whitespace-pre"
              }`}
            >
              {syntaxHighlighting}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

interface MessageContentProps {
  content: string;
}

const MessageContent: React.FC<MessageContentProps> = memo(({ content }) => {
  // Memoize the markdown components to prevent recreation
  const components: Components = useMemo(
    () => ({
      pre: ({ children, ...props }) => {
        const codeElement = Array.isArray(children) ? children[0] : children;

        if (codeElement && typeof codeElement === "object" && "props" in codeElement) {
          const codeProps = codeElement.props;
          const className = codeProps.className || "";
          const codeContent = String(codeProps.children || "");

          if (className.startsWith("language-")) {
            return <CodeBlock className={className}>{codeContent}</CodeBlock>;
          }
        }

        return <pre {...props}>{children}</pre>;
      },

      code: ({ children, className, ...props }) => {
        if (!className?.startsWith("language-")) {
          return (
            <code
              className="rounded bg-default-100 px-1.5 py-0.5 font-mono text-sm text-default-800 dark:bg-default-200 dark:text-default-800"
              {...props}
            >
              {children}
            </code>
          );
        }
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    }),
    []
  );

  return (
    <div className="prose prose-base prose-slate max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeRaw, rehypeKatex, rehypeSanitize]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MessageContent.displayName = "MessageContent";

interface MessageBubbleProps {
  message: UIMessage;
  onRetry: (messageId: string) => void;
  onFork: (messageId: string) => void;
}

const MessageBubble = memo(({ message, onRetry, onFork }: MessageBubbleProps) => {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

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

  // Memoize attachments rendering to prevent re-renders
  const renderAttachments = useMemo(() => {
    if (!message.experimental_attachments?.length) return null;

    return (
      <div className="mb-6 space-y-4">
        {message.experimental_attachments.map((attachment, index) => {
          if (
            attachment.url?.startsWith("data:image/") ||
            attachment.contentType?.startsWith("image/")
          ) {
            return (
              <div
                key={index}
                className="max-w-md overflow-hidden rounded-xl border border-divider shadow-lg transition-transform hover:scale-[1.02]"
              >
                <Image
                  src={attachment.url}
                  alt={attachment.name || "Image"}
                  width={500}
                  height={350}
                  className="h-auto w-full rounded-xl object-cover"
                  unoptimized
                />
              </div>
            );
          }

          return (
            <div
              key={index}
              className="flex items-center gap-4 rounded-xl border border-divider bg-gradient-to-r from-content1 to-content1/80 p-4 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-content2 text-xl shadow-sm">
                📎
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-foreground">
                  {attachment.name || "Attachment"}
                </span>
                <span className="text-sm text-default-500">{attachment.contentType}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [message.experimental_attachments]);

  // Memoize the action buttons to prevent re-renders
  const actionButtons = useMemo(() => {
    if (isUser) return null;

    return (
      <div
        className={`flex items-center gap-1 rounded-lg bg-content1/50 p-1 shadow-sm backdrop-blur-sm transition-all duration-300 ${
          showActions ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-95 opacity-0"
        }`}
      >
        <Tooltip content="Retry message" placement="top" delay={300}>
          <Button
            variant="light"
            size="sm"
            isIconOnly
            onPress={handleRetry}
            className="transition-all hover:scale-105 hover:bg-content2"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content={copied ? "Copied!" : "Copy message"} placement="top" delay={300}>
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
        </Tooltip>

        <Tooltip content="Fork from here" placement="top" delay={300}>
          <Button
            variant="light"
            size="sm"
            isIconOnly
            onPress={handleFork}
            className="transition-all hover:scale-105 hover:bg-content2"
          >
            <CodeBracketIcon className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>
    );
  }, [isUser, showActions, handleRetry, copied, handleCopy, handleFork]);

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
          {renderAttachments}
          {message.content && <MessageContent content={message.content} />}
        </div>

        <div className={`flex items-center gap-2 px-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          {actionButtons}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
