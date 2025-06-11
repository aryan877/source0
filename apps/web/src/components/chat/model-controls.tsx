"use client";

import { getModelById, type ReasoningLevel } from "@/config/models";
import { ChevronDownIcon, MagnifyingGlassIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import {
  CpuChipIcon as CpuChipIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
} from "@heroicons/react/24/solid";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from "@heroui/react";
import { useRef } from "react";

interface ModelControlsProps {
  selectedModel: string;
  reasoningLevel: ReasoningLevel;
  onReasoningLevelChange: (level: ReasoningLevel) => void;
  searchEnabled: boolean;
  onSearchToggle: (enabled: boolean) => void;
  onFileAttach: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading?: boolean;
}

export const ModelControls = ({
  selectedModel,
  reasoningLevel,
  onReasoningLevelChange,
  searchEnabled,
  onSearchToggle,
  onFileAttach,
  isLoading = false,
}: ModelControlsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelConfig = getModelById(selectedModel);

  // Check if model exists and has capabilities
  if (!modelConfig) {
    return null;
  }

  const hasReasoning = modelConfig.capabilities.includes("reasoning");
  const hasSearch = modelConfig.capabilities.includes("search");
  const supportsImages = modelConfig.capabilities.includes("image");
  const supportsPdf = modelConfig.capabilities.includes("pdf");
  const availableReasoningLevels = modelConfig.reasoningLevels || [];

  // Generate attachment tooltip content
  const getAttachmentTooltip = () => {
    const supportedTypes = [];
    if (supportsImages) supportedTypes.push("Images");
    if (supportsPdf) supportedTypes.push("PDF");
    supportedTypes.push("Text files"); // All models support text

    return `Attach files: ${supportedTypes.join(", ")}`;
  };

  // Generate accept attribute for file input
  const getFileAccept = () => {
    const accepts = [];
    if (supportsImages) accepts.push("image/*");
    if (supportsPdf) accepts.push(".pdf");
    accepts.push(".txt", ".doc", ".docx"); // Text files supported by all models
    return accepts.join(",");
  };

  const reasoningLevelLabels = {
    low: "Low",
    medium: "Medium",
    high: "High",
  } as const;

  const reasoningLevelDescriptions = {
    low: "Faster responses with basic reasoning",
    medium: "Balanced speed and reasoning quality",
    high: "Best reasoning quality, slower responses",
  } as const;

  // Always show attachment button since all models support text files at minimum
  const showAttachment = true;
  const showControls = hasReasoning || hasSearch || showAttachment;

  // Don't render anything if model has no supported capabilities
  if (!showControls) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileAttach}
        multiple
        accept={getFileAccept()}
        className="hidden"
      />

      {/* Reasoning Level Selector */}
      {hasReasoning && availableReasoningLevels.length > 0 && (
        <Dropdown>
          <DropdownTrigger>
            <Button
              variant="flat"
              size="sm"
              className="h-8 min-w-0 border-2 border-primary/20 bg-content2 px-3 transition-all duration-200 hover:border-primary/40 hover:bg-content3"
              startContent={<CpuChipIconSolid className="h-3.5 w-3.5 text-primary" />}
              endContent={<ChevronDownIcon className="h-3 w-3 text-default-500" />}
            >
              <span className="hidden text-xs font-medium sm:inline">
                {reasoningLevelLabels[reasoningLevel]}
              </span>
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            selectedKeys={[reasoningLevel]}
            selectionMode="single"
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0] as ReasoningLevel;
              onReasoningLevelChange(selectedKey);
            }}
            className="w-56"
          >
            {availableReasoningLevels.map((level) => (
              <DropdownItem
                key={level}
                textValue={level}
                classNames={{
                  base: "p-3",
                }}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    {reasoningLevelLabels[level]} Reasoning
                  </span>
                  <span className="text-xs text-default-500">
                    {reasoningLevelDescriptions[level]}
                  </span>
                </div>
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      )}

      {/* Search Toggle */}
      {hasSearch && (
        <Tooltip
          content={
            <div className="flex flex-col gap-1 p-1">
              <span className="font-medium">
                {searchEnabled ? "Web Search: ON" : "Web Search: OFF"}
              </span>
              <span className="text-xs text-default-400">
                {searchEnabled
                  ? "Click to disable web search"
                  : "Click to enable web search for real-time information"}
              </span>
            </div>
          }
          placement="top"
          delay={300}
        >
          <Button
            variant="flat"
            size="sm"
            className={`h-8 min-w-0 px-3 transition-all duration-200 ${
              searchEnabled
                ? "border-2 border-success bg-success/10 text-success hover:bg-success/20"
                : "border-2 border-default-200 bg-content2 hover:border-default-300 hover:bg-content3"
            }`}
            startContent={
              searchEnabled ? (
                <MagnifyingGlassIconSolid className="h-3.5 w-3.5" />
              ) : (
                <MagnifyingGlassIcon className="h-3.5 w-3.5" />
              )
            }
            onPress={() => onSearchToggle(!searchEnabled)}
          >
            <span className="hidden text-xs font-medium sm:inline">
              {searchEnabled ? "Search ON" : "Search"}
            </span>
          </Button>
        </Tooltip>
      )}

      {/* Attachment Button */}
      {showAttachment && (
        <Tooltip content={getAttachmentTooltip()} placement="top" delay={500}>
          <Button
            variant="flat"
            size="sm"
            isIconOnly
            className="h-8 w-8 flex-shrink-0 border-2 border-default-200 bg-content2 transition-all duration-200 hover:scale-105 hover:border-default-300 hover:bg-content3"
            onPress={() => fileInputRef.current?.click()}
            isDisabled={isLoading}
          >
            <PaperClipIcon className="h-4 w-4" />
          </Button>
        </Tooltip>
      )}
    </div>
  );
};
