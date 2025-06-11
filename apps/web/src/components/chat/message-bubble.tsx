"use client";

import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  CpuChipIcon,
  LinkIcon,
  UserIcon,
  WrenchScrewdriverIcon,
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
          <div>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onPress={handleWrapToggle}
              className={`h-6 w-6 transition-colors ${isWrapped ? "bg-content2" : ""}`}
              aria-pressed={isWrapped}
            >
              <div className={`transition-transform duration-200 ${isWrapped ? "rotate-90" : ""}`}>
                <ArrowsRightLeftIcon className="h-3 w-3" />
              </div>
            </Button>
          </div>
        </Tooltip>
        <Tooltip content={copied ? "Copied!" : "Copy"} placement="top" delay={300}>
          <div>
            <Button size="sm" variant="light" isIconOnly onPress={handleCopy} className="h-6 w-6">
              {copied ? (
                <CheckIcon className="h-3 w-3 text-success" />
              ) : (
                <ClipboardDocumentIcon className="h-3 w-3" />
              )}
            </Button>
          </div>
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

interface ExpandableSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  variant?: "reasoning" | "tool" | "source" | "default";
}

const ExpandableSection = memo(
  ({
    title,
    icon,
    children,
    defaultExpanded = false,
    variant = "default",
  }: ExpandableSectionProps) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const handleToggle = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    const variantStyles = useMemo(() => {
      switch (variant) {
        case "reasoning":
          return "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20";
        case "tool":
          return "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20";
        case "source":
          return "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20";
        default:
          return "border-default-200 bg-content2/30 dark:border-default-700";
      }
    }, [variant]);

    const iconColor = useMemo(() => {
      switch (variant) {
        case "reasoning":
          return "text-amber-600 dark:text-amber-400";
        case "tool":
          return "text-blue-600 dark:text-blue-400";
        case "source":
          return "text-green-600 dark:text-green-400";
        default:
          return "text-default-600 dark:text-default-400";
      }
    }, [variant]);

    return (
      <div
        className={`my-3 overflow-hidden rounded-lg border ${variantStyles} transition-all duration-200`}
      >
        <button
          onClick={handleToggle}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        >
          <div
            className={`flex h-6 w-6 items-center justify-center transition-transform duration-200 ${
              isExpanded ? "" : "-rotate-90"
            } ${iconColor}`}
          >
            {icon}
          </div>
          <span className="flex-1 font-medium text-foreground">{title}</span>
          <div
            className={`flex h-5 w-5 items-center justify-center text-default-500 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <ChevronDownIcon className="h-4 w-4" />
          </div>
        </button>

        {isExpanded && (
          <div className="overflow-hidden">
            <div className="border-t border-divider/50 p-3 pt-3">{children}</div>
          </div>
        )}
      </div>
    );
  }
);

ExpandableSection.displayName = "ExpandableSection";

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
            // Handle file parts (including images)
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
            }

            // Handle non-image files
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
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-default-700">Tool Call</h4>
                    <div className="mt-1 rounded bg-content2/50 p-2">
                      <code className="text-xs text-default-600">{toolName}</code>
                    </div>
                  </div>

                  {toolInvocation.args && (
                    <div>
                      <h4 className="text-sm font-medium text-default-700">Arguments</h4>
                      <div className="mt-1 rounded bg-content2/50 p-2">
                        <pre className="whitespace-pre-wrap text-xs text-default-600">
                          {JSON.stringify(toolInvocation.args, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {isComplete && "result" in toolInvocation && (
                    <div>
                      <h4 className="text-sm font-medium text-default-700">Result</h4>
                      <div className="mt-1 rounded bg-content2/50 p-2">
                        <pre className="whitespace-pre-wrap text-xs text-default-600">
                          {typeof toolInvocation.result === "string"
                            ? toolInvocation.result
                            : JSON.stringify(toolInvocation.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-default-500">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                        isComplete
                          ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                          : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                      }`}
                    >
                      {isComplete ? "Completed" : "In Progress"}
                    </span>
                    {toolInvocation.step && (
                      <span className="text-default-400">Step {toolInvocation.step}</span>
                    )}
                  </div>
                </div>
              </ExpandableSection>
            );
          }

          case "reasoning":
            // Handle reasoning parts with expandable section
            return (
              <ExpandableSection
                key={index}
                title="AI Reasoning"
                icon={<CpuChipIcon className="h-4 w-4" />}
                variant="reasoning"
              >
                <div className="space-y-3">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-sm text-default-700">
                      {part.reasoning}
                    </div>
                  </div>

                  {part.details && part.details.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-default-700">Details</h4>
                      <div className="space-y-2">
                        {part.details.map((detail, detailIndex) => (
                          <div key={detailIndex} className="rounded bg-content2/30 p-2">
                            {detail.type === "text" ? (
                              <div>
                                <div className="whitespace-pre-wrap text-xs text-default-600">
                                  {detail.text}
                                </div>
                                {detail.signature && (
                                  <div className="mt-1 text-xs text-default-500">
                                    Signature: {detail.signature}
                                  </div>
                                )}
                              </div>
                            ) : detail.type === "redacted" ? (
                              <div className="text-xs italic text-default-500">
                                [Redacted content - {detail.data.length} characters]
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
                <div className="space-y-3">
                  <div>
                    <a
                      href={part.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <LinkIcon className="h-3 w-3" />
                      {part.source.url}
                    </a>
                  </div>

                  {part.source.title && (
                    <div>
                      <h4 className="text-sm font-medium text-default-700">Title</h4>
                      <div className="mt-1 text-sm text-default-600">{part.source.title}</div>
                    </div>
                  )}

                  <div className="text-xs text-default-500">Source: {domain}</div>
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
    }, [message.parts]);

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
