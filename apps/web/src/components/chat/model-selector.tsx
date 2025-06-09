"use client";

import { BoltIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { Avatar, Chip, Select, SelectItem } from "@heroui/react";

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const models = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fast, efficient responses",
    isFree: true,
    provider: "Google",
  },
  {
    id: "gpt-4.5",
    name: "GPT-4.5",
    description: "Most capable model",
    isFree: false,
    provider: "OpenAI",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "Balanced performance",
    isFree: false,
    provider: "OpenAI",
  },
  {
    id: "claude-4-opus",
    name: "Claude 4 Opus",
    description: "Superior reasoning",
    isFree: false,
    provider: "Anthropic",
  },
  {
    id: "claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    description: "High performance",
    isFree: false,
    provider: "Anthropic",
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    description: "Advanced reasoning",
    isFree: false,
    provider: "DeepSeek",
  },
  {
    id: "deepseek-v2",
    name: "DeepSeek V2",
    description: "Latest version",
    isFree: false,
    provider: "DeepSeek",
  },
];

export const ModelSelector = ({ value, onValueChange }: ModelSelectorProps) => {
  const selectedModel = models.find((m) => m.id === value);

  return (
    <div className="flex items-center gap-3">
      <span className="text-default-600 text-sm font-medium">Model:</span>
      <Select
        selectedKeys={[value]}
        onSelectionChange={(keys) => {
          const selectedKey = Array.from(keys)[0] as string;
          onValueChange(selectedKey);
        }}
        className="w-[240px]"
        renderValue={() => (
          <div className="flex items-center gap-3">
            <Avatar
              size="sm"
              icon={
                selectedModel?.isFree ? (
                  <BoltIcon className="h-4 w-4" />
                ) : (
                  <LockClosedIcon className="h-4 w-4" />
                )
              }
              color={selectedModel?.isFree ? "success" : "default"}
            />
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold">{selectedModel?.name}</span>
              <span className="text-default-500 text-xs">{selectedModel?.provider}</span>
            </div>
          </div>
        )}
      >
        {models.map((model) => (
          <SelectItem key={model.id}>
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar
                  size="sm"
                  icon={
                    model.isFree ? (
                      <BoltIcon className="h-5 w-5" />
                    ) : (
                      <LockClosedIcon className="h-5 w-5" />
                    )
                  }
                  color={model.isFree ? "success" : "default"}
                />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{model.name}</span>
                    {model.isFree && (
                      <Chip color="success" variant="flat" size="sm">
                        Free
                      </Chip>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-default-600 text-xs">{model.description}</span>
                    <span className="text-default-400 text-xs">•</span>
                    <span className="text-default-500 text-xs font-medium">{model.provider}</span>
                  </div>
                </div>
              </div>
              {!model.isFree && (
                <Chip variant="flat" size="sm">
                  Login required
                </Chip>
              )}
            </div>
          </SelectItem>
        ))}
      </Select>
    </div>
  );
};
