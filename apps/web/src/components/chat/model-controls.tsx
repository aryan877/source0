"use client";

import { getModelById, type ReasoningLevel } from "@/config/models";
import { ALL_SUPPORTED_EXTENSIONS, ALL_SUPPORTED_MIME_TYPES } from "@/config/supported-files";
import { ChevronDownIcon, GlobeAltIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import {
  CpuChipIcon as CpuChipIconSolid,
  GlobeAltIcon as GlobeAltIconSolid,
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
        showControls: false,
        availableReasoningLevels: [],
      };
    }

    const hasReasoning = modelConfig.capabilities.includes("reasoning");
    const hasSearch = modelConfig.supportsFunctions || modelConfig.capabilities.includes("search");
    const availableReasoningLevels = modelConfig.reasoningLevels || [];
    const showAttachment = true;
    const showControls = hasReasoning || hasSearch || showAttachment;

    return {
      hasReasoning,
      hasSearch,
      availableReasoningLevels,
      showControls,
    };
  }, [modelConfig]);

  // Static file accept string from centralized config
  const fileAccept = [...ALL_SUPPORTED_MIME_TYPES, ...ALL_SUPPORTED_EXTENSIONS].join(",");

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
    <div className="flex items-center gap-2">
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
        <Dropdown placement="top-start">
          <DropdownTrigger>
            <Button
              variant="flat"
              size="sm"
              className="h-8 min-w-0 rounded-lg border border-primary/20 bg-content2/60 px-3 text-primary transition-all duration-200 hover:border-primary/40 hover:bg-content2"
              startContent={<CpuChipIconSolid className="h-4 w-4 text-primary" />}
              endContent={<ChevronDownIcon className="h-3 w-3 text-primary/70" />}
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
            className="w-64"
          >
            {computedValues.availableReasoningLevels.map((level) => (
              <DropdownItem
                key={level}
                textValue={level}
                classNames={{
                  base: "p-3 hover:bg-content2 transition-colors duration-200",
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <CpuChipIconSolid className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {reasoningLevelLabels[level]} Reasoning
                    </span>
                  </div>
                  <span className="pl-6 text-xs leading-relaxed text-foreground/70">
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
            <div className="flex max-w-xs flex-col gap-2 p-2">
              <div className="flex items-center gap-2">
                {searchEnabled ? (
                  <GlobeAltIconSolid className="h-4 w-4 text-success" />
                ) : (
                  <GlobeAltIcon className="h-4 w-4 text-foreground/60" />
                )}
                <span className="text-sm font-medium">
                  {searchEnabled ? "Web Search: ON" : "Web Search: OFF"}
                </span>
              </div>
              <span className="text-xs leading-relaxed text-foreground/70">
                {searchEnabled
                  ? modelConfig?.capabilities.includes("search")
                    ? "Using built-in search grounding for real-time information"
                    : "Using web search tool for current and accurate data"
                  : "Enable web search to get current information and real-time data"}
              </span>
            </div>
          }
          placement="top"
          delay={200}
          closeDelay={100}
          showArrow
        >
          <Button
            variant="flat"
            size="sm"
            className={`h-8 min-w-0 rounded-lg border px-3 text-xs font-medium transition-all duration-200 hover:scale-105 ${
              searchEnabled
                ? "border-success/30 bg-success/10 text-success hover:border-success/50 hover:bg-success/20"
                : "border-content2 bg-content2/60 text-foreground/70 hover:border-default-300 hover:bg-content2 hover:text-foreground/90"
            }`}
            startContent={
              searchEnabled ? (
                <GlobeAltIconSolid className="h-4 w-4" />
              ) : (
                <GlobeAltIcon className="h-4 w-4" />
              )
            }
            onPress={() => onSearchToggle(!searchEnabled)}
          >
            <span className="hidden sm:inline">{searchEnabled ? "Search ON" : "Search"}</span>
          </Button>
        </Tooltip>
      )}

      {/* Attachment Button */}
      <Tooltip
        content={
          <div className="flex flex-col gap-2 p-2">
            <div className="flex items-center gap-2">
              <PaperClipIcon className="h-4 w-4 text-foreground/80" />
              <span className="text-sm font-medium">Attach Files</span>
            </div>
            <span className="text-xs leading-relaxed text-foreground/70">
              Attach images, PDFs, or text files to enhance your conversation
            </span>
          </div>
        }
        placement="top"
        delay={200}
        closeDelay={100}
        showArrow
      >
        <Button
          variant="flat"
          size="sm"
          isIconOnly
          className="h-8 w-8 flex-shrink-0 rounded-lg border border-content2 bg-content2/60 text-foreground/70 transition-all duration-200 hover:scale-105 hover:border-default-300 hover:bg-content2 hover:text-foreground/90"
          onPress={() => fileInputRef.current?.click()}
          isDisabled={isLoading}
        >
          <PaperClipIcon className="h-4 w-4" />
        </Button>
      </Tooltip>
    </div>
  );
};
