"use client";

import { CapabilityIcon } from "@/components/chat/capability-icons";
import { ProviderIcon } from "@/components/chat/provider-section";
import { CAPABILITY_LABELS, ModelCapability, MODELS, type ModelConfig } from "@/config/models";
import { useModelFiltering } from "@/hooks/use-model-filtering";
import { useUserFiles } from "@/hooks/use-user-files";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { getAvailableCapabilities, getAvailableProviders } from "@/utils/favorites";
import { ArrowLeftIcon, ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Checkbox,
  Chip,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Spinner,
  Switch,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const [assistantName, setAssistantName] = useState("AI Assistant");
  const [userTraits, setUserTraits] = useState(
    "I prefer concise responses and enjoy technical discussions."
  );
  const [theme, setTheme] = useState("system");
  const [showStats, setShowStats] = useState(false);
  const [hidePersonalInfo, setHidePersonalInfo] = useState(false);
  const [disableBreaks, setDisableBreaks] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // State for filtering models
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

  // Use the custom hook for file management
  const {
    files,
    loading: loadingFiles,
    error: filesError,
    deleting,
    deleteFile,
    deleteMultipleFiles,
    clearError,
    refreshFiles,
  } = useUserFiles();

  const handleBack = () => {
    router.push("/");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleToggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(fileId)) {
        newSelection.delete(fileId);
      } else {
        newSelection.add(fileId);
      }
      return newSelection;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f: { id: string }) => f.id)));
    }
  };

  const handleDeleteSelected = async () => {
    const filesToDelete = files.filter((f: { id: string }) => selectedFiles.has(f.id));
    const paths = filesToDelete.map((f: { path: string }) => f.path);
    const ids = filesToDelete.map((f: { id: string }) => f.id);

    try {
      await deleteMultipleFiles(ids, paths);
      setSelectedFiles(new Set());
    } catch (error) {
      // Error is already handled by the hook
      console.error("Failed to delete selected files:", error);
    }
  };

  const clearFilters = () => {
    setSelectedCapabilities([]);
    setSelectedProvider(null);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-divider bg-content1 p-6">
        <Button variant="light" isIconOnly onPress={handleBack}>
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6">
          <Tabs
            defaultSelectedKey="customization"
            className="w-full"
            variant="underlined"
            color="primary"
            size="lg"
            radius="lg"
            classNames={{
              base: "w-full",
              tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
              cursor: "w-full bg-primary",
              tab: "max-w-fit px-0 h-12",
              tabContent: "group-data-[selected=true]:text-primary font-medium text-base",
              panel: "pt-8",
            }}
          >
            <Tab key="customization" title="Customization">
              <h3 className="mb-6 text-xl font-bold text-foreground">Personal Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-semibold text-foreground">
                    Assistant Name
                  </label>
                  <Input
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    placeholder="What should this app call you?"
                    variant="bordered"
                  />
                  <p className="mt-2 text-sm text-default-600">
                    This is how the assistant will address you in conversations.
                  </p>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold text-foreground">
                    Your Traits & Preferences
                  </label>
                  <Textarea
                    value={userTraits}
                    onChange={(e) => setUserTraits(e.target.value)}
                    placeholder="Tell the AI about your preferences, communication style, expertise, etc."
                    minRows={4}
                    variant="bordered"
                  />
                  <p className="mt-2 text-sm text-default-600">
                    Help the AI understand how to communicate with you effectively.
                  </p>
                </div>
              </div>

              <h3 className="mb-6 mt-12 text-xl font-bold text-foreground">Appearance</h3>
              <div className="space-y-6">
                <div>
                  <label className="mb-4 block text-sm font-semibold text-foreground">Theme</label>
                  <div className="flex gap-3">
                    {["light", "dark", "system"].map((themeOption) => (
                      <Button
                        key={themeOption}
                        variant={theme === themeOption ? "solid" : "bordered"}
                        onPress={() => setTheme(themeOption)}
                        color={theme === themeOption ? "primary" : "default"}
                        className="capitalize"
                      >
                        {themeOption}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-divider p-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Advanced Stats</label>
                    <p className="mt-1 text-sm text-default-600">
                      Show tokens per second, latency, and other metrics
                    </p>
                  </div>
                  <Switch isSelected={showStats} onValueChange={setShowStats} />
                </div>
              </div>
            </Tab>

            <Tab key="models" title="Models">
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
                      <Button
                        variant="flat"
                        endContent={<ChevronDownIcon className="h-4 w-4" />}
                        size="sm"
                      >
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
                      <Button
                        variant="flat"
                        endContent={<ChevronDownIcon className="h-4 w-4" />}
                        size="sm"
                      >
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
                    <p className="font-medium text-default-500">
                      No models match your search or filters.
                    </p>
                  </div>
                )}
              </div>
            </Tab>

            <Tab key="attachments" title="Attachments">
              <div>
                <h3 className="mb-2 text-xl font-bold text-foreground">Uploaded Attachments</h3>
                <p className="mb-6 text-sm text-default-600">
                  Manage all files you&apos;ve uploaded across chats
                </p>
              </div>

              {filesError && (
                <Alert color="danger" className="mb-6">
                  <div className="flex items-center justify-between">
                    <span>{filesError}</span>
                    <Button variant="light" color="danger" size="sm" onPress={clearError}>
                      Dismiss
                    </Button>
                  </div>
                </Alert>
              )}

              {selectedFiles.size > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-divider bg-content2 p-4">
                  <span className="text-sm font-medium text-foreground">
                    {selectedFiles.size} file(s) selected
                  </span>
                  <Button
                    color="danger"
                    variant="flat"
                    size="sm"
                    startContent={<TrashIcon className="h-4 w-4" />}
                    onPress={handleDeleteSelected}
                  >
                    Delete Selected
                  </Button>
                </div>
              )}

              {loadingFiles ? (
                <div className="flex justify-center py-16">
                  <Spinner label="Loading attachments..." />
                </div>
              ) : files.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mb-4 text-6xl">📎</div>
                  <p className="font-medium text-default-500">No attachments found</p>
                  <Button
                    variant="light"
                    color="primary"
                    onPress={refreshFiles}
                    startContent={<ArrowPathIcon className="h-4 w-4" />}
                    className="mt-4"
                  >
                    Refresh
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center border-b border-divider pb-2">
                    <Checkbox
                      isSelected={selectedFiles.size > 0 && selectedFiles.size === files.length}
                      isIndeterminate={selectedFiles.size > 0 && selectedFiles.size < files.length}
                      onValueChange={handleToggleSelectAll}
                    />
                    <span className="ml-4 text-sm font-semibold text-foreground">
                      {selectedFiles.size > 0 ? `${selectedFiles.size} selected` : "Select All"}
                    </span>
                  </div>
                  {files.map((file: any) => (
                    <div
                      key={file.id}
                      className={`rounded-xl border p-4 transition-colors ${
                        selectedFiles.has(file.id)
                          ? "border-primary bg-primary/10"
                          : "border-divider bg-content1"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            isSelected={selectedFiles.has(file.id)}
                            onValueChange={() => handleToggleFileSelection(file.id)}
                          />

                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-content2 text-xl">
                            {file.contentType.startsWith("image/") ? "🖼️" : "📄"}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{file.name}</p>
                            <div className="flex items-center gap-2 text-sm text-default-600">
                              <span className="font-medium">{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span>{file.chatFolder}</span>
                              <span>•</span>
                              <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="light"
                          isIconOnly
                          color="danger"
                          onPress={() => deleteFile(file.id, file.path)}
                          isLoading={deleting.has(file.id)}
                          isDisabled={deleting.has(file.id)}
                        >
                          {deleting.has(file.id) ? (
                            <Spinner size="sm" color="danger" />
                          ) : (
                            <TrashIcon className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Tab>

            <Tab key="general" title="General">
              <div>
                <h3 className="mb-2 text-xl font-bold text-foreground">Interface Options</h3>
                <p className="mb-6 text-sm text-default-600">Customize how the interface behaves</p>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-xl border border-divider p-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground">
                      Hide Personal Information
                    </label>
                    <p className="mt-1 text-sm text-default-600">
                      Hide name and email from the interface
                    </p>
                  </div>
                  <Switch isSelected={hidePersonalInfo} onValueChange={setHidePersonalInfo} />
                </div>

                <Divider />

                <div className="flex items-center justify-between rounded-xl border border-divider p-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground">
                      Disable Horizontal Breaks
                    </label>
                    <p className="mt-1 text-sm text-default-600">
                      Remove separator lines between messages
                    </p>
                  </div>
                  <Switch isSelected={disableBreaks} onValueChange={setDisableBreaks} />
                </div>
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
