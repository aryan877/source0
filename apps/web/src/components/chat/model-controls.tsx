"use client";

import { getModelById, type ReasoningLevel } from "@/config/models";
import {
  IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  PDF_EXTENSIONS,
  PDF_MIME_TYPES,
  TEXT_EXTENSIONS,
  TEXT_MIME_TYPES,
} from "@/config/supported-files";
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
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [isMounted, setIsMounted] = useState(false);

  // Ensure consistent rendering on client and server
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const modelConfig = getModelById(selectedModel);

  // Memoize computed values to prevent hydration mismatches
  const computedValues = useMemo(() => {
    if (!modelConfig) {
      return {
        hasReasoning: false,
        hasSearch: false,
        supportsImages: false,
        supportsPdf: false,
        availableReasoningLevels: [],
        showControls: false,
      };
    }

    const hasReasoning = modelConfig.capabilities.includes("reasoning");
    const hasSearch = modelConfig.capabilities.includes("search");
    const supportsImages = modelConfig.capabilities.includes("image");
    const supportsPdf = modelConfig.capabilities.includes("pdf");
    const availableReasoningLevels = modelConfig.reasoningLevels || [];
    const showAttachment = true;
    const showControls = hasReasoning || hasSearch || showAttachment;

    return {
      hasReasoning,
      hasSearch,
      supportsImages,
      supportsPdf,
      availableReasoningLevels,
      showControls,
    };
  }, [modelConfig]);

  // Memoize tooltip content
  const attachmentTooltip = useMemo(() => {
    const supportedTypes: string[] = [];
    if (computedValues.supportsImages) {
      supportedTypes.push("Images");
    }
    if (computedValues.supportsPdf) {
      supportedTypes.push("PDFs");
    }
    supportedTypes.push("Documents");
    return `Attach: ${supportedTypes.join(", ")}`;
  }, [computedValues.supportsImages, computedValues.supportsPdf]);

  // Memoize file accept string
  const fileAccept = useMemo(() => {
    const accepts = [...TEXT_MIME_TYPES, ...TEXT_EXTENSIONS];
    if (computedValues.supportsImages) {
      accepts.push(...IMAGE_MIME_TYPES, ...IMAGE_EXTENSIONS);
    }
    if (computedValues.supportsPdf) {
      accepts.push(...PDF_MIME_TYPES, ...PDF_EXTENSIONS);
    }
    return Array.from(new Set(accepts)).join(",");
  }, [computedValues.supportsImages, computedValues.supportsPdf]);

  // Memoize search button classes to prevent hydration issues
  const searchButtonClasses = useMemo(() => {
    const baseClasses = "h-8 min-w-0 px-3 transition-all duration-200 border-2";
    if (searchEnabled) {
      return `${baseClasses} border-success bg-success/10 text-success hover:bg-success/20`;
    }
    return `${baseClasses} border-default-200 bg-content2 hover:border-default-300 hover:bg-content3`;
  }, [searchEnabled]);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  // Check if model exists and has capabilities
  if (!modelConfig || !computedValues.showControls) {
    return null;
  }

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

  return (
    <div className="flex items-center gap-1.5">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileAttach}
        multiple
        accept={fileAccept}
        className="hidden"
      />

      {/* Reasoning Level Selector */}
      {computedValues.hasReasoning && computedValues.availableReasoningLevels.length > 0 && (
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
            {computedValues.availableReasoningLevels.map((level) => (
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
      {computedValues.hasSearch && (
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
            className={searchButtonClasses}
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
      <Tooltip content={attachmentTooltip} placement="top" delay={500}>
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
    </div>
  );
};
