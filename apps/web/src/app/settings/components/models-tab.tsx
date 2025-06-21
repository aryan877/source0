"use client";

import { CapabilityIcon } from "@/components/chat/capability-icons";
import { ProviderIcon } from "@/components/chat/provider-icon";
import { CAPABILITY_LABELS, ModelCapability, MODELS, type ModelConfig } from "@/config/models";
import { useModelFiltering } from "@/hooks/use-model-filtering";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { getAvailableCapabilities, getAvailableProviders } from "@/utils/favorites";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Switch,
} from "@heroui/react";
import { useMemo, useState } from "react";

export function ModelsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCapabilities, setSelectedCapabilities] = useState<ModelCapability[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ModelConfig["provider"] | null>(null);
  const { enabledModels, toggleModelEnabled } = useModelSelectorStore();

  const filteredModels = useModelFiltering(
    MODELS,
    searchQuery,
    selectedCapabilities,
    selectedProvider
  );

  const availableCapabilities = useMemo(() => getAvailableCapabilities(MODELS), []);
  const availableProviders = useMemo(() => getAvailableProviders(MODELS), []);

  const clearFilters = () => {
    setSelectedCapabilities([]);
    setSelectedProvider(null);
  };

  return (
    <div>
      <h3 className="mb-2 text-xl font-bold text-foreground">Manage Models</h3>
      <p className="mb-4 text-sm text-default-600">
        Enabled models will appear in the model selector during a chat.
      </p>
      <Input
        placeholder="Search models by name, provider, or description..."
        value={searchQuery}
        onValueChange={setSearchQuery}
        startContent={<MagnifyingGlassIcon className="h-5 w-5" />}
        isClearable
        onClear={() => setSearchQuery("")}
        className="mb-6"
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Dropdown closeOnSelect={false}>
          <DropdownTrigger>
            <Button variant="flat" endContent={<ChevronDownIcon className="h-4 w-4" />} size="sm">
              Capabilities
              {selectedCapabilities.length > 0 && ` (${selectedCapabilities.length})`}
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            selectionMode="multiple"
            selectedKeys={selectedCapabilities}
            onSelectionChange={(keys) =>
              setSelectedCapabilities(Array.from(keys) as ModelCapability[])
            }
            closeOnSelect={false}
          >
            {availableCapabilities.map((capability) => (
              <DropdownItem key={capability} textValue={CAPABILITY_LABELS[capability]}>
                <div className="flex items-center gap-2">
                  <CapabilityIcon capability={capability} />
                  {CAPABILITY_LABELS[capability]}
                </div>
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>

        <Dropdown>
          <DropdownTrigger>
            <Button variant="flat" endContent={<ChevronDownIcon className="h-4 w-4" />} size="sm">
              {selectedProvider || "Provider"}
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            selectionMode="single"
            selectedKeys={selectedProvider ? [selectedProvider] : []}
            onSelectionChange={(keys) =>
              setSelectedProvider(Array.from(keys)[0] as ModelConfig["provider"] | null)
            }
          >
            {availableProviders.map((provider) => (
              <DropdownItem key={provider}>{provider}</DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>

        {(selectedCapabilities.length > 0 || selectedProvider) && (
          <Button variant="light" color="danger" size="sm" onPress={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
      <div className="space-y-4">
        {filteredModels.map((model: ModelConfig) => (
          <Card key={model.id} className="border border-divider">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-1 items-start gap-4">
                  <div className="mt-1 flex-shrink-0">
                    <ProviderIcon provider={model.provider} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold text-foreground">{model.name}</span>
                    <span className="text-sm text-default-500">{model.description}</span>
                    {model.capabilities.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {model.capabilities.map((capability) => (
                          <Chip
                            key={capability}
                            size="sm"
                            variant="flat"
                            startContent={<CapabilityIcon capability={capability} />}
                            classNames={{ content: "text-xs" }}
                          >
                            {CAPABILITY_LABELS[capability]}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <Switch
                    isSelected={enabledModels.includes(model.id)}
                    onValueChange={() => toggleModelEnabled(model.id)}
                    aria-label={`Enable or disable ${model.name}`}
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
        {filteredModels.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-medium text-default-500">No models match your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
