"use client";

import { CustomFileUIPart } from "@/app/api/chat/utils/process-messages";
import { type GroundingMetadata } from "@/types/provider-metadata";
import type { WebSearchToolData } from "@/types/tools";
import type { TavilySearchResult } from "@/types/web-search";
import {
  ArrowPathIcon,
  BookmarkIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CpuChipIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Avatar, Button, Tooltip } from "@heroui/react";
import type { JSONValue, Message, ToolInvocation } from "ai";
import { GitBranchIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReasoningSpinner } from "../../hooks/use-reasoning-spinner";
import { BranchOptionsPanel } from "./branch-options-panel";
import { ExpandableSection } from "./expandable-section";
import { GroundingDisplay } from "./grounding-display";
import { MessageContent } from "./message-content";
import { SecureFileDisplay } from "./secure-file-display";
import { WebSearchDisplay } from "./web-search-display";

export interface ImagePendingData {
  type: "image_generation_pending";
}

export interface ImageErrorData {
  type: "image_generation_error";
  error: string;
}

interface MessageCompleteData {
  modelUsed?: string;
  modelProvider?: string;
  grounding?: GroundingMetadata;
}

/**
 * Safely extracts WebSearchToolData from a tool invocation.
 */
function getWebSearchData(toolInvocation: ToolInvocation): WebSearchToolData | null {
  if (
    toolInvocation.state === "result" &&
    toolInvocation.toolName === "webSearch" &&
    toolInvocation.result
  ) {
    const result = toolInvocation.result as WebSearchToolData;
    if (
      result.toolName === "webSearch" &&
      typeof result.originalQuery === "string" &&
      Array.isArray(result.searchResults)
    ) {
      return result as WebSearchToolData;
    }
  }
  return null;
}

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
  onBranch: (messageId: string, modelId?: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  isLoading?: boolean;
  chatId: string;
}

/**
 * Extract citations from web search tool invocations in the message
 */
function getCitationsFromMessage(message: Message): TavilySearchResult[] {
  if (!message.parts) return [];

  const citations: TavilySearchResult[] = [];

  for (const part of message.parts) {
    if (part.type === "tool-invocation" && part.toolInvocation.toolName === "webSearch") {
      const searchData = getWebSearchData(part.toolInvocation);
      if (searchData) {
        // The searchData contains an array of search results, each with its own array of sources.
        // We need to flatten this into a single list of citable sources.
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
  ({ message, onRetry, onBranch, onEdit, isLoading = false, chatId }: MessageBubbleProps) => {
    const [showActions, setShowActions] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content || "");
    const [showBranchOptions, setShowBranchOptions] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const branchButtonRef = useRef<HTMLDivElement>(null);
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
      setShowBranchOptions((prev) => !prev);
    }, []);

    const handleBranchWithModel = useCallback(
      (modelId: string) => {
        onBranch(message.id, modelId);
        setShowBranchOptions(false);
      },
      [onBranch, message.id]
    );

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
          <div className="space-y-4">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full resize-none rounded-xl border border-divider/50 bg-content1/80 p-4 text-sm leading-relaxed shadow-sm backdrop-blur-sm transition-all duration-200 focus:border-primary focus:bg-content1 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/10"
              placeholder="Edit your message..."
              style={{ minHeight: "80px", maxHeight: "400px" }}
            />
            <div className="flex items-center justify-end gap-3 pt-1">
              <Button
                size="sm"
                variant="light"
                onPress={handleCancelEdit}
                startContent={<XMarkIcon className="h-4 w-4" />}
                className="transition-all hover:scale-105"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                color="primary"
                onPress={handleSaveEdit}
                isDisabled={!editContent.trim() || editContent.trim() === message.content?.trim()}
                className="transition-all hover:scale-105"
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
                const searchData = getWebSearchData(toolInvocation);
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

            if (toolName === "memorySave") {
              if (toolInvocation.state === "call" || toolInvocation.state === "partial-call") {
                const content =
                  toolInvocation.args &&
                  typeof toolInvocation.args === "object" &&
                  "content" in toolInvocation.args
                    ? String(toolInvocation.args.content).slice(0, 50) +
                      (String(toolInvocation.args.content).length > 50 ? "..." : "")
                    : "information";

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-full border border-content2 bg-content2/60 px-4 py-2"
                  >
                    <BookmarkIcon className="h-4 w-4 animate-pulse text-primary" />
                    <span className="text-sm font-medium text-foreground/80">Saving memory...</span>
                    <span className="text-xs text-foreground/60">({content})</span>
                  </div>
                );
              } else if (toolInvocation.state === "result") {
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-4 py-2"
                  >
                    <BookmarkIcon className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">Memory saved</span>
                  </div>
                );
              }
            }

            if (toolName === "memoryRetrieve") {
              if (toolInvocation.state === "call" || toolInvocation.state === "partial-call") {
                const query =
                  toolInvocation.args &&
                  typeof toolInvocation.args === "object" &&
                  "query" in toolInvocation.args
                    ? String(toolInvocation.args.query).slice(0, 50) +
                      (String(toolInvocation.args.query).length > 50 ? "..." : "")
                    : "memories";

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-full border border-content2 bg-content2/60 px-4 py-2"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4 animate-pulse text-primary" />
                    <span className="text-sm font-medium text-foreground/80">
                      Retrieving memories...
                    </span>
                    <span className="text-xs text-foreground/60">({query})</span>
                  </div>
                );
              } else if (toolInvocation.state === "result") {
                return (
                  <div
                    key={index}
                    className="border-info/20 bg-info/10 flex items-center gap-2 rounded-full border px-4 py-2"
                  >
                    <MagnifyingGlassIcon className="text-info h-4 w-4" />
                    <span className="text-info text-sm font-medium">Retrieved memories</span>
                  </div>
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
                <MessageContent content={part.reasoning} citations={[]} />
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
              <div ref={branchButtonRef}>
                <Button
                  variant="light"
                  size="sm"
                  isIconOnly
                  onPress={handleBranch}
                  className="transition-all hover:scale-105 hover:bg-content2"
                >
                  <GitBranchIcon className="h-4 w-4" />
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
            isEditing && isUser
              ? "w-full items-end"
              : isUser
                ? "ml-auto max-w-[85%] items-end"
                : "w-full items-start"
          }`}
        >
          <div
            className={`flex flex-col gap-4 ${
              isEditing && isUser
                ? "w-full max-w-4xl rounded-2xl bg-content1/60 px-6 py-5 shadow-lg backdrop-blur-sm"
                : isUser
                  ? "rounded-2xl bg-content2 px-5 py-4"
                  : "w-full px-1"
            }`}
          >
            {renderMessageParts}
            {!isUser && renderGroundingMetadata}
          </div>

          {/* Action buttons and model info */}
          <div
            className={`relative flex items-center gap-2 ${isUser ? "justify-end" : "justify-end"}`}
          >
            {actionButtons}

            {/* Branch options panel */}
            {showBranchOptions && (
              <BranchOptionsPanel
                chatId={chatId}
                onBranchWithModel={handleBranchWithModel}
                onClose={() => setShowBranchOptions(false)}
                anchorRef={branchButtonRef}
              />
            )}

            {modelMetadata && !isUser && (
              <div
                className={`transition-opacity duration-200 ${
                  showActions && !isLoading && !isEditing ? "opacity-100" : "opacity-0"
                }`}
              >
                <Tooltip
                  content={`Provider: ${modelMetadata.modelProvider || "Unknown"}`}
                  placement="top"
                >
                  <div className="flex items-center gap-1.5 rounded-full bg-content2 px-2 py-1 text-xs text-foreground/60">
                    <span>{modelMetadata.modelUsed}</span>
                  </div>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
