"use client";

import {
  CAPABILITY_LABELS,
  MODELS,
  getModelById,
  type ModelCapability,
  type ModelConfig,
} from "@/config/models";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import {
  filterModelsByCapabilities,
  filterModelsByProvider,
  getAvailableCapabilities,
  getAvailableProviders,
} from "@/utils/favorites";
import {
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  CpuChipIcon,
  DocumentIcon,
  EyeIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import {
  Avatar,
  Button,
  Checkbox,
  CheckboxGroup,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Input,
  Select,
  SelectItem,
  Tooltip,
} from "@heroui/react";
import { Pin, PinOff } from "lucide-react";
import React, { useCallback, useEffect, useMemo } from "react";
import { ProviderIcon } from "./provider-section";

interface ModelSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  chatId: string;
}

const CapabilityIcon = React.memo(({ capability }: { capability: ModelCapability }) => {
  const iconMap = {
    image: <EyeIcon className="h-4 w-4 text-blue-500" />,
    pdf: <DocumentIcon className="h-4 w-4 text-red-500" />,
    search: <MagnifyingGlassIcon className="h-4 w-4 text-green-500" />,
    reasoning: <CpuChipIcon className="h-4 w-4 text-purple-500" />,
    "image-generation": <PhotoIcon className="h-4 w-4 text-orange-500" />,
  };
  return iconMap[capability] || null;
});
CapabilityIcon.displayName = "CapabilityIcon";

const ModelAvatar = React.memo(({ model }: { model: ModelConfig }) => {
  return (
    <div className="relative flex-shrink-0">
      <Avatar
        size="sm"
        icon={<ProviderIcon provider={model.provider} />}
        className="flex-shrink-0"
      />
    </div>
  );
});
ModelAvatar.displayName = "ModelAvatar";

const PinIcon = React.memo(({ isPinned }: { isPinned: boolean }) =>
  isPinned ? <PinOff className="h-4 w-4 text-primary" /> : <Pin className="h-4 w-4" />
);
PinIcon.displayName = "PinIcon";

// Compact filter dropdown component
const CompactFilters = ({
  selectedCapabilities,
  onCapabilitiesChange,
  selectedProvider,
  onProviderChange,
  onClearFilters,
}: {
  selectedCapabilities: ModelCapability[];
  onCapabilitiesChange: (capabilities: ModelCapability[]) => void;
  selectedProvider: ModelConfig["provider"] | null;
  onProviderChange: (provider: ModelConfig["provider"] | null) => void;
  onClearFilters: () => void;
}) => {
  const availableCapabilities = useMemo(() => getAvailableCapabilities(MODELS), []);
  const availableProviders = useMemo(() => getAvailableProviders(MODELS), []);

  const hasActiveFilters = selectedCapabilities.length > 0 || selectedProvider;

  return (
    <Dropdown
      closeOnSelect={false}
      shouldBlockScroll={false}
      backdrop="transparent"
      placement="right-start"
      offset={10}
    >
      <DropdownTrigger>
        <Button
          variant="flat"
          size="sm"
          startContent={<AdjustmentsHorizontalIcon className="h-4 w-4" />}
          endContent={<ChevronDownIcon className="h-3 w-3" />}
          className={`h-7 text-xs ${hasActiveFilters ? "border-primary text-primary" : ""}`}
          disableRipple
        >
          Filters{" "}
          {hasActiveFilters && `(${selectedCapabilities.length + (selectedProvider ? 1 : 0)})`}
        </Button>
      </DropdownTrigger>

      <DropdownMenu closeOnSelect={false} className="w-80">
        <DropdownSection title="Filter Options">
          <DropdownItem
            key="capabilities-filter"
            textValue="Capabilities"
            closeOnSelect={false}
            classNames={{ base: "cursor-default p-2 data-[hover=true]:bg-transparent" }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Capabilities</span>
                {selectedCapabilities.length > 0 && (
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => onCapabilitiesChange([])}
                    className="h-5 px-1 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>

              <CheckboxGroup
                value={selectedCapabilities}
                onValueChange={(value) => onCapabilitiesChange(value as ModelCapability[])}
                size="sm"
                orientation="vertical"
                classNames={{
                  wrapper: "gap-1",
                }}
              >
                {availableCapabilities.map((capability) => (
                  <Checkbox
                    key={capability}
                    value={capability}
                    size="sm"
                    classNames={{
                      base: "max-w-full",
                      label: "text-xs font-normal",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <CapabilityIcon capability={capability} />
                      {CAPABILITY_LABELS[capability]}
                    </div>
                  </Checkbox>
                ))}
              </CheckboxGroup>
            </div>
          </DropdownItem>

          <DropdownItem
            key="provider-filter"
            textValue="Provider"
            closeOnSelect={false}
            classNames={{ base: "cursor-default p-2 data-[hover=true]:bg-transparent" }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Provider</span>
                {selectedProvider && (
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => onProviderChange(null)}
                    className="h-5 px-1 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>

              <Select
                placeholder="Select provider..."
                selectedKeys={selectedProvider ? new Set([selectedProvider]) : new Set()}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0] as ModelConfig["provider"];
                  onProviderChange(selectedKey || null);
                }}
                size="sm"
                disallowEmptySelection={false}
                hideEmptyContent
                classNames={{
                  trigger: "h-8 min-h-8",
                  value: "text-xs",
                }}
                renderValue={(items) => {
                  if (items.length === 0) {
                    return <span className="text-foreground-500">Select provider...</span>;
                  }
                  return (
                    <span className="text-xs font-medium text-foreground">
                      {Array.from(items)[0]?.textValue}
                    </span>
                  );
                }}
              >
                {availableProviders.map((provider) => (
                  <SelectItem key={provider}>{provider}</SelectItem>
                ))}
              </Select>
            </div>
          </DropdownItem>

          {hasActiveFilters ? (
            <DropdownItem
              key="clear-all"
              textValue="Clear All Filters"
              closeOnSelect={false}
              classNames={{ base: "cursor-default p-2 data-[hover=true]:bg-transparent" }}
            >
              <div className="space-y-2">
                <span className="text-xs font-medium text-danger">Reset Filters</span>
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  onPress={onClearFilters}
                  className="h-7 w-full text-xs"
                  startContent={
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  }
                >
                  Clear All Filters
                </Button>
              </div>
            </DropdownItem>
          ) : null}
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
};

// Model filtering hook
function useModelFiltering(
  searchQuery: string,
  selectedCapabilities: ModelCapability[],
  selectedProvider: ModelConfig["provider"] | null,
  favorites: string[]
) {
  return useMemo(() => {
    let models = [...MODELS];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      models = models.filter((model) => {
        const searchText = `${model.name} ${model.provider} ${model.description}`.toLowerCase();
        return searchText.includes(query);
      });
    }

    if (selectedCapabilities.length > 0) {
      models = filterModelsByCapabilities(models, selectedCapabilities);
    }

    if (selectedProvider) {
      models = filterModelsByProvider(models, selectedProvider);
    }

    return models.sort((a, b) => {
      const aIsFav = favorites.includes(a.id);
      const bIsFav = favorites.includes(b.id);

      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [searchQuery, selectedCapabilities, selectedProvider, favorites]);
}

export const ModelSelector = ({ value, onValueChange, chatId }: ModelSelectorProps) => {
  const {
    isOpen,
    viewMode,
    searchQuery,
    selectedCapabilities,
    selectedProvider,
    favorites,
    hasHydrated,
    setIsOpen,
    setViewMode,
    setSearchQuery,
    setSelectedCapabilities,
    setSelectedProvider,
    toggleFavorite,
    setSelectedModel,
    getSelectedModel,
    setHasHydrated,
    clearFilters,
    resetState,
  } = useModelSelectorStore();

  // Ensure hydration happens on client side
  useEffect(() => {
    if (!hasHydrated) {
      setHasHydrated(true);
    }
  }, [hasHydrated, setHasHydrated]);

  // Use store value if no external value provided
  const currentSelectedModel = value ?? getSelectedModel(chatId);
  const selectedModel = getModelById(currentSelectedModel);

  const filteredModels = useModelFiltering(
    searchQuery,
    selectedCapabilities,
    selectedProvider,
    favorites
  );

  const filteredFavorites = useMemo(() => {
    if (!searchQuery.trim()) return favorites;

    const query = searchQuery.toLowerCase();
    return favorites.filter((modelId) => {
      const model = getModelById(modelId);
      if (!model) return false;
      const searchText = `${model.name} ${model.provider} ${model.description}`.toLowerCase();
      return searchText.includes(query);
    });
  }, [favorites, searchQuery]);

  const handleToggleFavorite = useCallback(
    (modelId: string) => {
      toggleFavorite(modelId);
    },
    [toggleFavorite]
  );

  const handleModelSelect = useCallback(
    (modelId: string) => {
      setSelectedModel(chatId, modelId);
      onValueChange?.(modelId);
      setIsOpen(false);
    },
    [chatId, onValueChange, setSelectedModel, setIsOpen]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
    },
    [setIsOpen]
  );

  const renderModelItem = (model: ModelConfig, isFavorite: boolean, showPinOnHover = false) => (
    <div className="group relative flex w-full items-start gap-3">
      <div className="relative flex-shrink-0">
        <ModelAvatar model={model} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold">{model.name}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1 text-xs text-default-500">
          <span className="truncate">{model.provider}</span>
          {model.description && (
            <>
              <span className="hidden sm:inline">•</span>
              <Tooltip
                content={model.description}
                placement="top"
                delay={300}
                closeDelay={100}
                showArrow
                size="sm"
                classNames={{
                  content: "max-w-xs text-xs p-2",
                }}
              >
                <InformationCircleIcon className="h-3 w-3 text-default-400 hover:text-default-600" />
              </Tooltip>
            </>
          )}
        </div>

        {/* Capability icons in a separate row below */}
        {model.capabilities.length > 0 && (
          <div className="mt-1 flex items-center gap-1.5">
            {model.capabilities.map((capability) => (
              <Tooltip
                key={capability}
                content={CAPABILITY_LABELS[capability]}
                placement="top"
                delay={500}
                closeDelay={100}
                showArrow
                size="sm"
              >
                <div>
                  <CapabilityIcon capability={capability} />
                </div>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {/* Pin button as elegant overlay on absolute top-right corner */}
      {showPinOnHover && (
        <Button
          isIconOnly
          size="sm"
          variant="flat"
          className="absolute -right-1 -top-1 h-6 w-6 min-w-6 border border-divider/60 bg-background/95 opacity-0 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:border-primary/60 hover:bg-primary/10 group-hover:opacity-100"
          onPress={() => handleToggleFavorite(model.id)}
          onClick={(event) => {
            event.stopPropagation();
          }}
          aria-label={isFavorite ? "Unpin from favorites" : "Pin to favorites"}
        >
          <PinIcon isPinned={isFavorite} />
        </Button>
      )}
    </div>
  );

  // Don't render until hydrated to prevent flash of default content
  if (!hasHydrated) {
    return (
      <Button
        variant="flat"
        size="sm"
        className="h-8 min-w-0 max-w-[200px] justify-between bg-content2 px-3 sm:max-w-[250px]"
        endContent={<ChevronDownIcon className="h-3 w-3 flex-shrink-0" />}
        isDisabled
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-col items-start">
            <span className="truncate text-xs font-medium">Loading...</span>
          </div>
        </div>
      </Button>
    );
  }

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      closeOnSelect={false}
      shouldBlockScroll={true}
      backdrop="opaque"
    >
      <DropdownTrigger>
        <Button
          variant="flat"
          size="sm"
          className="h-8 min-w-0 max-w-[200px] justify-between bg-content2 px-3 sm:max-w-[250px]"
          endContent={<ChevronDownIcon className="h-3 w-3 flex-shrink-0" />}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-col items-start">
              <span className="truncate text-xs font-medium">
                {selectedModel?.name || "Select Model"}
              </span>
            </div>
          </div>
        </Button>
      </DropdownTrigger>

      <DropdownMenu
        closeOnSelect={false}
        className={viewMode === "expanded" ? "w-80 sm:w-96" : "w-72 sm:w-80"}
        classNames={{
          base: `${viewMode === "expanded" ? "max-h-[85vh]" : "max-h-[70vh]"} overflow-hidden flex flex-col`,
          list: "overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-default-300 [&::-webkit-scrollbar-thumb]:rounded-lg [&>*]:mr-3 [&_[data-focus-visible=true]]:outline-none [&_[data-focus-visible=true]]:ring-0 [&_[data-focus-visible=true]]:shadow-none",
        }}
        autoFocus="first"
        shouldFocusWrap
        itemClasses={{
          base: "data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0 data-[focus-visible=true]:shadow-none focus:outline-none focus:ring-0 focus:shadow-none",
        }}
        topContent={
          <div className="flex-shrink-0 border-b border-divider px-1 py-2">
            {viewMode === "expanded" ? (
              <>
                <div className="flex items-center justify-between gap-2 px-2 py-1">
                  <Button
                    variant="light"
                    size="sm"
                    startContent={<ArrowLeftIcon className="h-4 w-4" />}
                    onPress={() => resetState()}
                    className="h-7 px-2 text-xs"
                  >
                    Back to Favorites
                  </Button>

                  <CompactFilters
                    selectedCapabilities={selectedCapabilities}
                    onCapabilitiesChange={setSelectedCapabilities}
                    selectedProvider={selectedProvider}
                    onProviderChange={setSelectedProvider}
                    onClearFilters={clearFilters}
                  />
                </div>

                <div className="px-2 py-1">
                  <Input
                    placeholder="Search models..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    startContent={<MagnifyingGlassIcon className="h-4 w-4" />}
                    size="sm"
                    isClearable
                    onClear={() => setSearchQuery("")}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="px-2 py-1">
                  <Input
                    placeholder="Search favorites..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    startContent={<MagnifyingGlassIcon className="h-4 w-4" />}
                    size="sm"
                    isClearable
                    onClear={() => setSearchQuery("")}
                  />
                </div>

                <div className="px-2 py-1">
                  <Button
                    variant="flat"
                    size="sm"
                    startContent={<StarIcon className="h-4 w-4" />}
                    onPress={() => setViewMode("expanded")}
                    className="h-7 w-full justify-start text-xs"
                    color="primary"
                  >
                    Browse All Models
                  </Button>
                </div>
              </>
            )}
          </div>
        }
      >
        {viewMode === "normal" ? (
          <>
            {/* Favorites */}
            <DropdownSection title="Favorites" classNames={{ base: "mt-3" }}>
              {filteredFavorites.length === 0 ? (
                <DropdownItem key="no-favorites" isDisabled textValue="No favorites">
                  {favorites.length === 0 ? "No favorites yet" : "No favorites match search"}
                </DropdownItem>
              ) : (
                filteredFavorites
                  .map((modelId) => {
                    const model = getModelById(modelId);
                    if (!model) return null;

                    return (
                      <DropdownItem
                        key={`fav-${model.id}`}
                        textValue={model.name}
                        closeOnSelect={false}
                        onClick={(event) => {
                          const target = event.target as HTMLElement;
                          const isPinButton = target.closest('[aria-label*="favorites"]');

                          if (!isPinButton) {
                            handleModelSelect(model.id);
                          }
                        }}
                        classNames={{
                          base: "p-2 gap-2 h-auto hover:bg-content2 transition-colors data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0 data-[focus-visible=true]:shadow-none focus:outline-none focus:ring-0 focus:shadow-none",
                        }}
                      >
                        {renderModelItem(model, true, true)}
                      </DropdownItem>
                    );
                  })
                  .filter(Boolean)
              )}
            </DropdownSection>
          </>
        ) : (
          <>
            {/* Favorites Section in Expanded View */}
            {filteredModels.filter((model) => favorites.includes(model.id)).length > 0 && (
              <DropdownSection
                title={`Favorites (${filteredModels.filter((model) => favorites.includes(model.id)).length})`}
                showDivider={
                  filteredModels.filter((model) => !favorites.includes(model.id)).length > 0
                }
                classNames={{
                  base: "mt-3",
                  heading: "text-sm font-semibold text-primary px-3 py-2",
                }}
              >
                {filteredModels
                  .filter((model) => favorites.includes(model.id))
                  .map((model) => (
                    <DropdownItem
                      key={`fav-${model.id}`}
                      textValue={model.name}
                      closeOnSelect={false}
                      onClick={(event) => {
                        const target = event.target as HTMLElement;
                        const isPinButton = target.closest('[aria-label*="favorites"]');

                        if (!isPinButton) {
                          handleModelSelect(model.id);
                        }
                      }}
                      classNames={{
                        base: "p-2 gap-2 h-auto hover:bg-content2 transition-colors data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0 data-[focus-visible=true]:shadow-none focus:outline-none focus:ring-0 focus:shadow-none",
                      }}
                    >
                      {renderModelItem(model, true, true)}
                    </DropdownItem>
                  ))}
              </DropdownSection>
            )}

            {/* Other Models Section in Expanded View */}
            <DropdownSection
              title={`Other Models (${filteredModels.filter((model) => !favorites.includes(model.id)).length})`}
              classNames={{
                base:
                  filteredModels.filter((model) => favorites.includes(model.id)).length === 0
                    ? "mt-3"
                    : "",
                heading: "text-sm font-semibold text-primary px-3 py-2",
              }}
            >
              {filteredModels.filter((model) => !favorites.includes(model.id)).length === 0 ? (
                <DropdownItem key="no-other-models" isDisabled textValue="No other models">
                  All models are in favorites
                </DropdownItem>
              ) : (
                filteredModels
                  .filter((model) => !favorites.includes(model.id))
                  .map((model) => (
                    <DropdownItem
                      key={`other-${model.id}`}
                      textValue={model.name}
                      closeOnSelect={false}
                      onClick={(event) => {
                        const target = event.target as HTMLElement;
                        const isPinButton = target.closest('[aria-label*="favorites"]');

                        if (!isPinButton) {
                          handleModelSelect(model.id);
                        }
                      }}
                      classNames={{
                        base: "p-2 gap-2 h-auto hover:bg-content2 transition-colors data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-0 data-[focus-visible=true]:ring-offset-0 data-[focus-visible=true]:shadow-none focus:outline-none focus:ring-0 focus:shadow-none",
                      }}
                    >
                      {renderModelItem(model, false, true)}
                    </DropdownItem>
                  ))
              )}
            </DropdownSection>
          </>
        )}
      </DropdownMenu>
    </Dropdown>
  );
};
