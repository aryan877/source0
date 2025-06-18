"use client";

import { type GroundingMetadata } from "@/types/provider-metadata";
import { handleToolInvocation } from "@/types/tools";
import type { TavilySearchResult } from "@/types/web-search";
import {
  ArrowPathIcon,
  ArrowTurnRightUpIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CpuChipIcon,
  PencilIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Avatar, Button, Tooltip } from "@heroui/react";
import type { JSONValue, Message } from "ai";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReasoningSpinner } from "../../hooks/use-reasoning-spinner";
import { ExpandableSection } from "./expandable-section";
import { GroundingDisplay } from "./grounding-display";
import { MessageContent } from "./message-content";
import { SecureFileDisplay } from "./secure-file-display";
import { WebSearchDisplay } from "./web-search-display";

/**
 * Custom type definition for file parts in our message system.
 *
 * The AI SDK's built-in FileUIPart uses base64 data, but our application
 * uses a URL-based file system. This interface defines the structure
 * we expect when casting file parts from the AI SDK format.
 */
interface CustomFileUIPart {
  type: "file";
  url: string;
  mimeType: string;
  filename?: string;
  path?: string;
}

interface MessageCompleteData {
  modelUsed?: string;
  modelProvider?: string;
  grounding?: GroundingMetadata;
}

// A simplified type guard that checks for the properties we need on a JSONValue object
function getMessageCompleteData(
  annotations: readonly JSONValue[] | undefined
): MessageCompleteData | null {
  if (!annotations) return null;

  const annotation = annotations.find(
    (a) =>
      typeof a === "object" &&
      a !== null &&
      !Array.isArray(a) &&
      (a as { type?: string }).type === "message_complete"
  );

  if (annotation) {
    const data = (annotation as { data?: unknown }).data;
    if (typeof data === "object" && data !== null) {
      return data as MessageCompleteData;
    }
  }

  return null;
}

interface MessageBubbleProps {
  message: Message;
  onRetry: (messageId: string) => void;
  onBranch: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  isLoading?: boolean;
}

/**
 * Extract citations from web search tool invocations in the message
 */
function getCitationsFromMessage(message: Message): TavilySearchResult[] {
  if (!message.parts) return [];

  const citations: TavilySearchResult[] = [];

  for (const part of message.parts) {
    if (part.type === "tool-invocation" && part.toolInvocation.toolName === "webSearch") {
      const searchData = handleToolInvocation(part.toolInvocation, "webSearch");
      if (searchData) {
        // Add all search results as numbered citations
        searchData.searchResults.forEach((result) => {
          if (!result.error && result.results) {
            citations.push(...result.results);
          }
        });
      }
    }
  }

  return citations;
}

const MessageBubble = memo(
  ({ message, onRetry, onBranch, onEdit, isLoading = false }: MessageBubbleProps) => {
    const [showActions, setShowActions] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content || "");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isUser = message.role === "user";

    const { isReasoningStreaming } = useReasoningSpinner({
      message,
      isLoading,
    });

    // Auto-resize textarea and focus when editing starts
    useEffect(() => {
      if (isEditing && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        // Auto-resize
        const adjustHeight = () => {
          textarea.style.height = "auto";
          textarea.style.height = Math.min(textarea.scrollHeight, 300) + "px";
        };
        adjustHeight();

        const handleInput = () => adjustHeight();
        textarea.addEventListener("input", handleInput);
        return () => textarea.removeEventListener("input", handleInput);
      }
    }, [isEditing]);

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

    const handleBranch = useCallback(() => {
      onBranch(message.id);
    }, [onBranch, message.id]);

    const handleStartEdit = useCallback(() => {
      setEditContent(message.content || "");
      setIsEditing(true);
      setShowActions(false);
    }, [message.content]);

    const handleCancelEdit = useCallback(() => {
      setIsEditing(false);
      setEditContent(message.content || "");
    }, [message.content]);

    const handleSaveEdit = useCallback(() => {
      if (onEdit && editContent.trim() !== message.content?.trim()) {
        onEdit(message.id, editContent.trim());
      }
      setIsEditing(false);
    }, [onEdit, message.id, editContent, message.content]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSaveEdit();
        } else if (e.key === "Escape") {
          handleCancelEdit();
        }
      },
      [handleSaveEdit, handleCancelEdit]
    );

    const modelMetadata = useMemo(() => {
      if (isUser) return null;

      const completeData = getMessageCompleteData(message.annotations);

      if (!completeData?.modelUsed) {
        return null;
      }

      return {
        modelUsed: completeData.modelUsed,
        modelProvider: completeData.modelProvider,
      };
    }, [message.annotations, isUser]);

    // Render message parts using the AI SDK's built-in parts system
    const renderMessageParts = useMemo(() => {
      // If editing, show textarea instead of message content
      if (isEditing && isUser) {
        return (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full resize-none rounded-lg border border-divider bg-content1 p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Edit your message..."
              style={{ minHeight: "60px", maxHeight: "300px" }}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="light"
                onPress={handleCancelEdit}
                startContent={<XMarkIcon className="h-4 w-4" />}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                color="primary"
                onPress={handleSaveEdit}
                isDisabled={!editContent.trim() || editContent.trim() === message.content?.trim()}
              >
                Send
              </Button>
            </div>
          </div>
        );
      }

      // Always use parts - no fallback needed for modern implementation
      if (!message.parts?.length) {
        return null;
      }

      return message.parts.map((part, index) => {
        switch (part.type) {
          case "text":
            return (
              <div key={index}>
                <MessageContent content={part.text} citations={getCitationsFromMessage(message)} />
              </div>
            );

          case "file": {
            // The AI SDK's `FileUIPart` is for base64 data. Our app uses a custom
            // structure with a URL. We cast to `unknown` first, then to our custom
            // type to inform TypeScript that this is an intentional conversion.
            const filePart = part as unknown as CustomFileUIPart;
            return (
              <SecureFileDisplay
                key={index}
                url={filePart.url}
                mimeType={filePart.mimeType}
                fileName={filePart.filename}
                isImage={filePart.mimeType?.startsWith("image/")}
              />
            );
          }

          case "tool-invocation": {
            // Handle tool invocations - only show specific tool displays
            const toolInvocation = part.toolInvocation;
            const toolName = toolInvocation.toolName || "Unknown Tool";

            if (toolName === "webSearch") {
              if (toolInvocation.state === "result") {
                const searchData = handleToolInvocation(toolInvocation, "webSearch");
                return (
                  <WebSearchDisplay key={index} state={toolInvocation.state} data={searchData} />
                );
              } else {
                return (
                  <WebSearchDisplay
                    key={index}
                    state={toolInvocation.state}
                    args={toolInvocation.args}
                  />
                );
              }
            }

            // No fallback - only show supported tool displays
            return null;
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
                autoExpand={true}
              >
                <MessageContent
                  content={part.reasoning}
                  citations={getCitationsFromMessage(message)}
                />
              </ExpandableSection>
            );

          // case "source": {
          //   // Handle source parts with expandable section
          //   const domain = new URL(part.source.url).hostname;
          //   return (
          //     <ExpandableSection
          //       key={index}
          //       title={part.source.title || domain}
          //       icon={<LinkIcon className="h-4 w-4" />}
          //       variant="source"
          //     >
          //       <div className="space-y-4">
          //         <div>
          //           <a
          //             href={part.source.url}
          //             target="_blank"
          //             rel="noopener noreferrer"
          //             className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          //           >
          //             <LinkIcon className="h-4 w-4" />
          //             <span className="break-all">{part.source.url}</span>
          //           </a>
          //         </div>

          //         {part.source.title && (
          //           <div>
          //             <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground/80">
          //               <div className="h-1 w-1 rounded-full bg-current opacity-60"></div>
          //               Title
          //             </h4>
          //             <div className="rounded-lg border border-divider/30 bg-content1/60 p-3 shadow-sm">
          //               <div className="text-sm font-medium">{part.source.title}</div>
          //             </div>
          //           </div>
          //         )}

          //         <div className="flex items-center gap-2 border-t border-divider/20 pt-2">
          //           <span className="text-xs font-medium text-foreground/60">Source:</span>
          //           <span className="rounded bg-content2/50 px-2 py-1 font-mono text-xs text-foreground/70">
          //             {domain}
          //           </span>
          //         </div>
          //       </div>
          //     </ExpandableSection>
          //   );
          // }

          case "step-start":
            return null;

          default:
            return null;
        }
      });
    }, [
      isReasoningStreaming,
      message,
      isEditing,
      isUser,
      editContent,
      handleKeyDown,
      handleCancelEdit,
      handleSaveEdit,
    ]);

    const renderGroundingMetadata = useMemo(() => {
      const completeData = getMessageCompleteData(message.annotations);
      const grounding = completeData?.grounding as GroundingMetadata | undefined;

      // Only render if we have actual grounding data with content
      if (
        !grounding ||
        (!grounding.webSearchQueries?.length &&
          !grounding.groundingChunks?.length &&
          !grounding.groundingSupports?.length)
      ) {
        return null;
      }

      return <GroundingDisplay grounding={grounding} />;
    }, [message.annotations]);

    // Memoize the action buttons to prevent re-renders
    const actionButtons = useMemo(() => {
      // Don't show actions when loading/streaming or editing
      if (isLoading || isEditing) return null;

      return (
        <div
          className={`flex items-center gap-1 rounded-lg bg-content1/50 p-1 shadow-sm backdrop-blur-sm transition-opacity duration-200 ${showActions ? "opacity-100" : "opacity-0"}`}
        >
          {isUser && onEdit && (
            <Tooltip content="Edit message" placement="top" delay={300}>
              <div>
                <Button
                  variant="light"
                  size="sm"
                  isIconOnly
                  onPress={handleStartEdit}
                  className="transition-all hover:scale-105 hover:bg-content2"
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
              </div>
            </Tooltip>
          )}

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

          {!isUser && (
            <Tooltip content="Branch from here" placement="top" delay={300}>
              <div>
                <Button
                  variant="light"
                  size="sm"
                  isIconOnly
                  onPress={handleBranch}
                  className="transition-all hover:scale-105 hover:bg-content2"
                >
                  <ArrowTurnRightUpIcon className="h-4 w-4" />
                </Button>
              </div>
            </Tooltip>
          )}
        </div>
      );
    }, [
      showActions,
      handleStartEdit,
      handleRetry,
      copied,
      handleCopy,
      handleBranch,
      isLoading,
      isUser,
      isEditing,
      onEdit,
    ]);

    return (
      <div
        className={`group flex gap-6 ${isUser ? "flex-row-reverse" : "flex-row"} transition-all duration-200`}
        onMouseEnter={() => !isEditing && setShowActions(true)}
        onMouseLeave={() => !isEditing && setShowActions(false)}
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
          <div
            className={`flex flex-col gap-4 ${
              isUser ? "rounded-2xl bg-content2 px-5 py-4" : "w-full px-1"
            }`}
          >
            {renderMessageParts}
            {!isUser && renderGroundingMetadata}
          </div>

          {/* Action buttons and model info */}
          <div
            className={`flex w-full items-center ${isUser ? "justify-end" : "justify-between"} pl-1 pr-2`}
          >
            <div className="flex items-center gap-2">
              {actionButtons}
              <div
                className={`transition-opacity duration-200 ${showActions && !isLoading && !isEditing ? "opacity-100" : "opacity-0"}`}
              >
                {modelMetadata && !isUser && (
                  <Tooltip
                    content={`Provider: ${modelMetadata.modelProvider || "Unknown"}`}
                    placement="top"
                  >
                    <div className="flex items-center gap-1.5 rounded-full bg-content2 px-2 py-1 text-xs text-foreground/60">
                      <span>{modelMetadata.modelUsed}</span>
                    </div>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
