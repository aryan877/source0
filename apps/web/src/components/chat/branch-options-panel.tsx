"use client";

import { getModelById, type ModelConfig, MODELS } from "@/config/models";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { Button, Divider } from "@heroui/react";
import { memo, useEffect, useMemo, useRef } from "react";
import { ProviderIcon } from "./provider-icon";

interface BranchOptionsPanelProps {
  chatId: string;
  onBranchWithModel: (modelId: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}

export const BranchOptionsPanel = memo(
  ({ chatId, onBranchWithModel, onClose, anchorRef }: BranchOptionsPanelProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const { getSelectedModel, enabledModels } = useModelSelectorStore();
    const currentModelId = getSelectedModel(chatId);
    const currentModel = useMemo(() => getModelById(currentModelId), [currentModelId]);

    const modelsByProvider = useMemo(() => {
      if (!enabledModels) return {};
      const availableModels = MODELS.filter((m) => enabledModels.includes(m.id));
      const grouped: Record<string, ModelConfig[]> = {};
      for (const model of availableModels) {
        if (!grouped[model.provider]) {
          grouped[model.provider] = [];
        }
        const providerGroup = grouped[model.provider];
        if (providerGroup) {
          providerGroup.push(model);
        }
      }

      const orderedGrouped: Record<string, ModelConfig[]> = {};
      Object.keys(grouped)
        .filter((key) => grouped[key] !== undefined)
        .sort()
        .forEach((key) => {
          const models = grouped[key];
          if (models) {
            models.sort((a, b) => a.name.localeCompare(b.name));
            orderedGrouped[key] = models;
          }
        });

      return orderedGrouped;
    }, [enabledModels]);

    // Click outside to close
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          panelRef.current &&
          !panelRef.current.contains(event.target as Node) &&
          anchorRef.current &&
          !anchorRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [onClose, anchorRef]);

    return (
      <div
        ref={panelRef}
        className="absolute bottom-full right-0 z-10 mb-2 w-80 rounded-xl border border-divider bg-content1 p-2 shadow-2xl"
      >
        <p className="px-2 py-1 text-sm font-semibold text-foreground">Branch with...</p>
        <div className="max-h-80 overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-lg [&::-webkit-scrollbar-thumb]:bg-default-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
          {currentModel && (
            <>
              <div className="px-1 pt-1">
                <Button
                  variant="flat"
                  color="primary"
                  size="md"
                  onPress={() => onBranchWithModel(currentModel.id)}
                  className="h-auto w-full justify-start px-2 py-2"
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">{currentModel.name}</span>
                    <span className="text-xs font-medium text-primary/80">(current)</span>
                  </div>
                </Button>
              </div>
              <Divider className="my-2" />
            </>
          )}
          {Object.entries(modelsByProvider).map(([provider, models]) => (
            <div key={provider} className="px-1">
              <p className="flex items-center gap-2 px-2 py-2 text-xs font-semibold uppercase text-foreground/60">
                <ProviderIcon provider={provider as ModelConfig["provider"]} className="h-4 w-4" />
                {provider}
              </p>
              <div className="flex flex-col gap-1">
                {models.map((model) => (
                  <Button
                    key={model.id}
                    variant="light"
                    size="md"
                    onPress={() => onBranchWithModel(model.id)}
                    className="h-auto w-full justify-start px-2 py-2 text-left"
                    isDisabled={model.id === currentModelId}
                  >
                    <span className="text-sm font-medium">{model.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

BranchOptionsPanel.displayName = "BranchOptionsPanel";
