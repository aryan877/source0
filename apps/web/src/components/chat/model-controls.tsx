"use client";

import { getModelById, type ReasoningLevel } from "@/config/models";
import {
  ChevronDownIcon,
  CpuChipIcon,
  MagnifyingGlassIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";
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
    medium: "Med",
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
    <div className="flex items-center gap-1">
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
              className="h-8 min-w-0 bg-content2 px-2"
              startContent={<CpuChipIcon className="h-3 w-3" />}
              endContent={<ChevronDownIcon className="h-3 w-3" />}
            >
              <span className="hidden text-xs sm:inline">
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
                  base: "p-2",
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
          content={searchEnabled ? "Web search enabled" : "Enable web search"}
          placement="top"
          delay={500}
        >
          <Button
            variant={searchEnabled ? "solid" : "flat"}
            size="sm"
            className="h-8 min-w-0 px-2"
            color={searchEnabled ? "primary" : "default"}
            startContent={<MagnifyingGlassIcon className="h-3 w-3" />}
            onPress={() => onSearchToggle(!searchEnabled)}
          >
            <span className="hidden text-xs sm:inline">Search</span>
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
            className="h-8 w-8 flex-shrink-0"
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
