"use client";

import { getModelById, type ModelConfig, MODELS } from "@/config/models";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { Button, Divider } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
    const [positionClass, setPositionClass] = useState("bottom-full mb-2");
    const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

    useLayoutEffect(() => {
      if (anchorRef.current && panelRef.current) {
        const anchorRect = anchorRef.current.getBoundingClientRect();
        const panelHeight = panelRef.current.offsetHeight;

        const spaceAbove = anchorRect.top;
        const spaceBelow = window.innerHeight - anchorRect.bottom;

        if (spaceAbove < panelHeight && spaceBelow > panelHeight) {
          setPositionClass("top-full mt-2");
        } else {
          setPositionClass("bottom-full mb-2");
        }

        setStyle({ opacity: 1 });
      }
    }, [anchorRef]);

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

    const variants = {
      enter: (direction: number) => ({
        x: direction > 0 ? 20 : -20,
        opacity: 0,
      }),
      center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
      },
      exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 20 : -20,
        opacity: 0,
      }),
    };

    const direction = selectedProvider ? 1 : -1;

    return (
      <div
        ref={panelRef}
        className={`absolute right-0 z-[9999] w-80 overflow-hidden rounded-xl border border-divider bg-content1 p-2 shadow-2xl transition-opacity ${positionClass}`}
        style={style}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          {!selectedProvider ? (
            <motion.div
              key="providers"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15 }}
            >
              <p className="px-2 py-1 text-sm font-semibold text-foreground">Branch with...</p>
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
              <div className="flex flex-col gap-1">
                {Object.keys(modelsByProvider).map((provider) => (
                  <Button
                    key={provider}
                    variant="light"
                    size="md"
                    onPress={() => setSelectedProvider(provider)}
                    className="h-auto w-full justify-start px-2 py-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <ProviderIcon
                        provider={provider as ModelConfig["provider"]}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">{provider}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="models"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center">
                <Button
                  variant="light"
                  size="sm"
                  isIconOnly
                  onPress={() => setSelectedProvider(null)}
                  className="mr-2"
                  aria-label="Back to providers"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <p className="flex items-center gap-2 py-1 text-sm font-semibold uppercase text-foreground/80">
                  <ProviderIcon
                    provider={selectedProvider as ModelConfig["provider"]}
                    className="h-4 w-4"
                  />
                  {selectedProvider}
                </p>
              </div>
              <Divider className="my-2" />
              <div className="max-h-[250px] overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-lg [&::-webkit-scrollbar-thumb]:bg-default-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
                <div className="flex flex-col gap-1">
                  {modelsByProvider[selectedProvider]?.map((model) => (
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

BranchOptionsPanel.displayName = "BranchOptionsPanel";
