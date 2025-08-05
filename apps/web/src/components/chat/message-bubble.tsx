"use client";

import { type GroundingMetadata } from "@/types/provider-metadata";
import type { WebSearchToolData } from "@/types/tools";
import type { TavilySearchResult } from "@/types/web-search";
import {
  ArrowPathIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CpuChipIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Avatar, Button, Tooltip } from "@heroui/react";
import type { UIMessage } from "ai";
import { GitBranchIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReasoningSpinner } from "../../hooks/use-reasoning-spinner";
import { BranchOptionsPanel } from "./branch-options-panel";
import { ExpandableSection } from "./expandable-section";
import { GroundingDisplay } from "./grounding-display";
import { MessageContent } from "./message-content";
import { StreamingIndicator } from "./streaming-indicator";
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
 * Safely extracts WebSearchToolData from a tool part.
 */
function getWebSearchData(toolPart: {
  type: string;
  state?: string;
  output?: unknown;
  input?: unknown;
  toolName?: string;
}): WebSearchToolData | null {
  // Handle both AI SDK v4 and v5 tool types
  const isWebSearchTool =
    toolPart.type === "tool-webSearch" ||
    (toolPart.type === "dynamic-tool" && toolPart.toolName === "webSearch");

  if (
    isWebSearchTool &&
    "state" in toolPart &&
    toolPart.state === "output-available" &&
    "output" in toolPart &&
    toolPart.output
  ) {
    const result = toolPart.output as WebSearchToolData;
    if (
      result.toolName === "webSearch" &&
      typeof result.originalQuery === "string" &&
      Array.isArray(result.searchResults)
    ) {
      return result;
    }
  }
  return null;
}

function getMessageCompleteData(metadata: unknown): MessageCompleteData | null {
  if (!metadata || typeof metadata !== "object") return null;

  return metadata as MessageCompleteData;
}

interface MessageBubbleProps {
  message: UIMessage;
  onRetry: (messageId: string) => void;
  onBranch: (messageId: string, modelId?: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  chatId: string;
  onBranchOptionsToggle?: (isOpen: boolean) => void;
}

/**
 * Extract citations from web search tool invocations in the message
 */
function getCitationsFromMessage(message: UIMessage): TavilySearchResult[] {
  if (!message.parts) return [];

  const citations: TavilySearchResult[] = [];

  for (const part of message.parts) {
    if (part.type === "tool-webSearch") {
      const searchData = getWebSearchData(part);
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
  ({
    message,
    onRetry,
    onBranch,
    onEdit,
    onDelete,
    isLoading = false,
    isDeleting = false,
    chatId,
    onBranchOptionsToggle,
  }: MessageBubbleProps) => {
    const [showActions, setShowActions] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(
      message.parts?.find((p) => p.type === "text")?.text || ""
    );
    const [showBranchOptions, setShowBranchOptions] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const branchButtonRef = useRef<HTMLDivElement>(null);
    const isUser = message.role === "user";

    const { isReasoningStreaming } = useReasoningSpinner({
      message,
      isLoading,
    });

    useEffect(() => {
      onBranchOptionsToggle?.(showBranchOptions);
    }, [showBranchOptions, onBranchOptionsToggle]);

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
      const textContent =
        message.parts
          ?.filter((part) => part.type === "text")
          .map((part) => (part.type === "text" ? part.text : ""))
          .join("") || "";
      if (textContent) {
        try {
          await navigator.clipboard.writeText(textContent);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (error) {
          console.error("Failed to copy:", error);
        }
      }
    }, [message.parts]);

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
      setEditContent(message.parts?.find((p) => p.type === "text")?.text || "");
      setIsEditing(true);
      setShowActions(false);
    }, [message.parts]);

    const handleCancelEdit = useCallback(() => {
      setIsEditing(false);
      const textContent = message.parts?.find((p) => p.type === "text")?.text || "";
      setEditContent(textContent);
    }, [message.parts]);

    const handleSaveEdit = useCallback(() => {
      const textContent = message.parts?.find((p) => p.type === "text")?.text || "";
      if (onEdit && editContent.trim() !== textContent.trim()) {
        onEdit(message.id, editContent.trim());
      }
      setIsEditing(false);
    }, [onEdit, message.id, editContent, message.parts]);

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

    const handleDelete = useCallback(() => {
      if (onDelete) {
        onDelete(message.id);
        setShowDeleteConfirm(false);
      }
    }, [onDelete, message.id]);

    const handleDeleteClick = useCallback(() => {
      setShowDeleteConfirm(true);
      setShowActions(false);
    }, []);

    const handleCancelDelete = useCallback(() => {
      setShowDeleteConfirm(false);
    }, []);

    const modelMetadata = useMemo(() => {
      if (isUser) return null;

      const completeData = getMessageCompleteData(message.metadata);

      if (!completeData?.modelUsed) {
        return null;
      }

      return {
        modelUsed: completeData.modelUsed,
        modelProvider: completeData.modelProvider,
      };
    }, [message.metadata, isUser]);

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
                isDisabled={
                  !editContent.trim() ||
                  editContent.trim() ===
                    (message.parts?.find((p) => p.type === "text")?.text || "").trim()
                }
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
        // Handle tool parts - in AI SDK v5, check for both specific tool types and dynamic tools
        if (
          part.type === "tool-webSearch" ||
          (part.type === "dynamic-tool" && "toolName" in part && part.toolName === "webSearch")
        ) {
          // Check if it's an output-available state for WebSearchDisplay
          if ("state" in part && part.state === "output-available") {
            const searchData = getWebSearchData(part);
            return <WebSearchDisplay key={index} state={part.state} data={searchData} />;
          } else if (
            "state" in part &&
            (part.state === "input-available" || part.state === "input-streaming")
          ) {
            // For call or partial-call states
            return (
              <WebSearchDisplay
                key={index}
                state={part.state}
                args={"input" in part ? part.input : undefined}
              />
            );
          }
        }

        // Handle non-tool parts
        switch (part.type) {
          case "text":
            return (
              <div key={index} className="flex-1">
                <MessageContent
                  content={part.text}
                  citations={getCitationsFromMessage(message)}
                  isUser={isUser}
                />
              </div>
            );

          case "reasoning":
            return (
              <ExpandableSection
                key={index}
                title="Reasoning"
                icon={<CpuChipIcon className="h-4 w-4" />}
                defaultExpanded={false}
                isLoading={isReasoningStreaming}
                autoExpand={true}
              >
                <MessageContent content={part.text} citations={[]} isUser={isUser} />
              </ExpandableSection>
            );

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
      const completeData = getMessageCompleteData(message.metadata);
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
    }, [message.metadata]);

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

          {onDelete && !showDeleteConfirm && (
            <Tooltip content="Delete message" placement="top" delay={300}>
              <div>
                <Button
                  variant="light"
                  size="sm"
                  isIconOnly
                  onPress={handleDeleteClick}
                  isLoading={isDeleting}
                  isDisabled={isDeleting}
                  className="transition-all hover:scale-105 hover:bg-content2 hover:text-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </Tooltip>
          )}

          {onDelete && showDeleteConfirm && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2">
              <span className="text-sm font-medium text-danger">Delete?</span>
              <Button
                size="sm"
                variant="light"
                onPress={handleCancelDelete}
                className="h-6 px-2 text-xs"
              >
                Cancel
              </Button>
              <Button size="sm" color="danger" onPress={handleDelete} className="h-6 px-2 text-xs">
                Delete
              </Button>
            </div>
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
      handleDeleteClick,
      isLoading,
      isDeleting,
      isUser,
      isEditing,
      onEdit,
      onDelete,
      handleCancelDelete,
      handleDelete,
      showDeleteConfirm,
    ]);

    return (
      <div
        className={`group flex h-full gap-6 ${isUser ? "flex-row-reverse" : "flex-row"} transition-all duration-200`}
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
          className={`flex h-full flex-col gap-3 ${
            isEditing && isUser
              ? "w-full items-end"
              : isUser
                ? "ml-auto max-w-[85%] items-end"
                : "w-full items-start"
          }`}
        >
          <div
            className={`relative flex h-full flex-col gap-3 ${
              isEditing && isUser
                ? "w-full max-w-4xl rounded-2xl bg-content1/60 px-6 py-5 shadow-lg backdrop-blur-sm"
                : isUser
                  ? "rounded-2xl bg-content2 px-5 py-4"
                  : "w-full px-1"
            }`}
          >
            <div className="space-y-3">{renderMessageParts}</div>
            {isLoading && !isUser && <StreamingIndicator />}
            {isLoading && isUser && (
              <div className="mt-2">
                <StreamingIndicator />
              </div>
            )}
            {!isUser && renderGroundingMetadata}
          </div>

          {/* Action buttons and model info */}
          <div
            className={`relative flex items-center gap-2 ${isUser ? "justify-end" : "justify-end"}`}
          >
            <div className="relative">
              {actionButtons}

              {/* Branch options panel - positioned close to action buttons */}
              {showBranchOptions && (
                <div className="absolute right-0 top-full z-50 mt-1">
                  <BranchOptionsPanel
                    chatId={chatId}
                    onBranchWithModel={handleBranchWithModel}
                    onClose={() => setShowBranchOptions(false)}
                    anchorRef={branchButtonRef}
                  />
                </div>
              )}
            </div>

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
