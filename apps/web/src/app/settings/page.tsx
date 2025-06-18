"use client";

import { SecureFileDisplay } from "@/components/chat";
import { CapabilityIcon } from "@/components/chat/capability-icons";
import { ProviderIcon } from "@/components/chat/provider-section";
import { CAPABILITY_LABELS, ModelCapability, MODELS, type ModelConfig } from "@/config/models";
import { useModelFiltering } from "@/hooks/use-model-filtering";
import { useUserFiles } from "@/hooks/use-user-files";
import { getApiKeySchema } from "@/lib/validations/api-keys";
import { useApiKeysStore, type SupportedProvider } from "@/stores/api-keys-store";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { themeOptions, useUserPreferencesStore } from "@/stores/user-preferences-store";
import { getAvailableCapabilities, getAvailableProviders } from "@/utils/favorites";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import {
  addToast,
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
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Switch,
  Tab,
  Tabs,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import { useTheme } from "next-themes";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type Key } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const selectedTab = searchParams.get("tab") || "customization";

  const handleTabChange = (key: Key) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", String(key));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const {
    assistantName,
    setAssistantName,
    userTraits,
    setUserTraits,
    hidePersonalInfo,
    setHidePersonalInfo,
    showSamplePrompts,
    setShowSamplePrompts,
  } = useUserPreferencesStore();
  const { theme, setTheme } = useTheme();

  const [localAssistantName, setLocalAssistantName] = useState(assistantName);
  const [localUserTraits, setLocalUserTraits] = useState(userTraits);

  useEffect(() => {
    setLocalAssistantName(assistantName);
  }, [assistantName]);

  useEffect(() => {
    setLocalUserTraits(userTraits);
  }, [userTraits]);

  const personalInfoHasChanges =
    localAssistantName !== assistantName || localUserTraits !== userTraits;

  const handleSavePersonalInfo = () => {
    setAssistantName(localAssistantName);
    setUserTraits(localUserTraits);
    addToast({
      title: "Settings Saved",
      description: "Your personal settings have been updated.",
      color: "success",
    });
  };

  const handleResetPersonalInfo = () => {
    setLocalAssistantName(assistantName);
    setLocalUserTraits(userTraits);
  };

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // State for filtering models
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCapabilities, setSelectedCapabilities] = useState<ModelCapability[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ModelConfig["provider"] | null>(null);
  const { enabledModels, toggleModelEnabled } = useModelSelectorStore();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure();
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "single"; id: string; path: string } | { type: "multiple"; ids: string[] } | null
  >(null);
  const [isDeletingForModal, setIsDeletingForModal] = useState(false);

  // API Keys store
  const {
    apiKeys,
    globalByokEnabled,
    setApiKey,
    removeApiKey,
    setGlobalByokEnabled,
    isProviderKeySet,
    getSupportedProviders,
    clearAllKeys,
  } = useApiKeysStore();

  // State for API keys UI
  const [showApiKeys, setShowApiKeys] = useState<Record<SupportedProvider, boolean>>(
    {} as Record<SupportedProvider, boolean>
  );
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<SupportedProvider, string>>(
    {} as Record<SupportedProvider, string>
  );

  const supportedProviders = useMemo(() => getSupportedProviders(), [getSupportedProviders]);

  useEffect(() => {
    setApiKeyInputs(apiKeys);
  }, [apiKeys]);

  const handleApiKeyChange = (provider: SupportedProvider, value: string) => {
    setApiKeyInputs((prev) => ({ ...prev, [provider]: value }));
  };

  const handleSaveApiKey = (provider: SupportedProvider) => {
    const key = apiKeyInputs[provider];
    if (!key || !key.trim()) {
      addToast({
        title: "Error",
        description: "API key cannot be empty.",
        color: "danger",
      });
      return;
    }

    const schema = getApiKeySchema(provider);
    const validationResult = schema.safeParse(key.trim());

    if (!validationResult.success) {
      addToast({
        title: "Invalid API Key",
        description: validationResult.error.errors[0]?.message || "Invalid format.",
        color: "danger",
      });
    } else {
      if (typeof validationResult.data === "string") {
        setApiKey(provider, validationResult.data);
        addToast({
          title: "API Key Saved",
          description: `Your ${provider} API key has been saved.`,
          color: "success",
        });
      }
    }
  };

  const handleRemoveApiKey = (provider: SupportedProvider) => {
    removeApiKey(provider);
    setApiKeyInputs((prev) => ({ ...prev, [provider]: "" }));
    addToast({
      title: "API Key Removed",
      description: `Your ${provider} API key has been removed.`,
      color: "warning",
    });
  };

  const handleToggleShowApiKey = (provider: SupportedProvider) => {
    setShowApiKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleClearAllKeys = () => {
    clearAllKeys();
    setApiKeyInputs({} as Record<SupportedProvider, string>);
    addToast({
      title: "All Keys Cleared",
      description: "All personal API keys have been removed.",
      color: "warning",
    });
  };

  const filteredModels = useModelFiltering(
    MODELS,
    searchQuery,
    selectedCapabilities,
    selectedProvider
  );

  const availableCapabilities = useMemo(() => getAvailableCapabilities(MODELS), []);
  const availableProviders = useMemo(() => getAvailableProviders(MODELS), []);

  const {
    files,
    loading: loadingFiles,
    error: filesError,
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
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedFiles.size > 0) {
      setDeleteTarget({ type: "multiple", ids: Array.from(selectedFiles) });
      onDeleteModalOpen();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeletingForModal(true);
    try {
      if (deleteTarget.type === "single") {
        await deleteFile(deleteTarget.id, deleteTarget.path);
      } else {
        const filesToDelete = files.filter((f) => deleteTarget.ids.includes(f.id));
        const paths = filesToDelete.map((f) => f.path);
        await deleteMultipleFiles(deleteTarget.ids, paths);
        setSelectedFiles(new Set());
      }
    } finally {
      setIsDeletingForModal(false);
      onDeleteModalClose();
      setDeleteTarget(null);
    }
  };

  const clearFilters = () => {
    setSelectedCapabilities([]);
    setSelectedProvider(null);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-divider bg-content1/80 p-6 backdrop-blur-md">
        <Button variant="light" isIconOnly onPress={handleBack}>
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto overscroll-contain">
        <div className="isolate z-0 mx-auto max-w-5xl p-6">
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={handleTabChange}
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
                    value={localAssistantName}
                    onChange={(e) => setLocalAssistantName(e.target.value)}
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
                    value={localUserTraits}
                    onChange={(e) => setLocalUserTraits(e.target.value)}
                    placeholder="Tell the AI about your preferences, communication style, expertise, etc."
                    minRows={4}
                    variant="bordered"
                  />
                  <p className="mt-2 text-sm text-default-600">
                    Help the AI understand how to communicate with you effectively.
                  </p>
                </div>

                {personalInfoHasChanges && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="flat" color="default" onPress={handleResetPersonalInfo}>
                      Cancel
                    </Button>
                    <Button color="primary" onPress={handleSavePersonalInfo}>
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>

              <h3 className="mb-6 mt-12 text-xl font-bold text-foreground">Appearance</h3>
              <div className="space-y-6">
                <div>
                  <label className="mb-4 block text-sm font-semibold text-foreground">Theme</label>
                  <div className="flex flex-wrap gap-3">
                    {!isMounted &&
                      themeOptions.map((option) => (
                        <div
                          key={option.key}
                          className="h-10 w-24 animate-pulse rounded-lg bg-content2"
                        />
                      ))}
                    {isMounted &&
                      themeOptions.map((themeOption) => (
                        <Button
                          key={themeOption.key}
                          variant={theme === themeOption.key ? "solid" : "bordered"}
                          onPress={() => setTheme(themeOption.key)}
                          color={theme === themeOption.key ? "primary" : "default"}
                          className="capitalize"
                          startContent={<span className="text-lg">{themeOption.icon}</span>}
                        >
                          {themeOption.label}
                        </Button>
                      ))}
                  </div>
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
                    isDisabled={isDeletingForModal || selectedFiles.size === 0}
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
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={`rounded-xl border p-4 transition-colors ${
                        selectedFiles.has(file.id)
                          ? "border-primary bg-primary/10"
                          : "border-divider bg-content1"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-1 items-start gap-4">
                          <Checkbox
                            isSelected={selectedFiles.has(file.id)}
                            onValueChange={() => handleToggleFileSelection(file.id)}
                            className="mt-1 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="max-w-xs">
                              <SecureFileDisplay
                                url={file.url}
                                mimeType={file.contentType}
                                fileName={file.name}
                                isImage={file.contentType.startsWith("image/")}
                                className="!mb-0"
                                displaySize="small"
                              />
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-default-600">
                              <span className="font-medium">{formatFileSize(file.size)}</span>
                              <span className="text-default-400">/</span>
                              <span>{file.chatFolder}</span>
                              <span className="text-default-400">/</span>
                              <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="light"
                          isIconOnly
                          color="danger"
                          onPress={() => {
                            setDeleteTarget({ type: "single", id: file.id, path: file.path });
                            onDeleteModalOpen();
                          }}
                          isDisabled={isDeletingForModal}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Tab>

            <Tab key="api-keys" title="API Keys">
              <div className="space-y-8">
                <Alert>
                  <div className="flex items-center">
                    <span className="ml-2 text-sm">
                      Your API keys are stored securely in your browser&apos;s local storage and are
                      are sent to our server on per request basis.
                    </span>
                  </div>
                </Alert>
                <div>
                  <h3 className="mb-2 text-xl font-bold text-foreground">
                    Bring Your Own Key (BYOK)
                  </h3>
                  <p className="mb-6 text-sm text-default-600">
                    Use your own API keys for certain providers. When enabled, your keys will be
                    used instead of the default ones.
                  </p>
                  <div className="flex items-center justify-between rounded-xl border border-divider p-4">
                    <div>
                      <label className="text-sm font-semibold text-foreground">
                        Enable Bring Your Own Key
                      </label>
                      <p className="mt-1 text-sm text-default-600">
                        Globally enable or disable using your own keys.
                      </p>
                    </div>
                    <Switch
                      isSelected={globalByokEnabled}
                      onValueChange={(isSelected) => {
                        setGlobalByokEnabled(isSelected);
                        addToast({
                          title: "Setting Changed",
                          description: `Bring Your Own Key is now ${
                            isSelected ? "enabled" : "disabled"
                          }.`,
                          color: "primary",
                        });
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="mb-4 text-lg font-bold text-foreground">Provider API Keys</h3>
                    <Button
                      variant="light"
                      color="danger"
                      size="sm"
                      onPress={handleClearAllKeys}
                      startContent={<TrashIcon className="h-4 w-4" />}
                    >
                      Clear All Keys
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {supportedProviders.map((provider) => (
                      <Card key={provider} className="border border-divider">
                        <CardBody className="p-4">
                          <div className="flex items-center gap-4">
                            <ProviderIcon provider={provider} className="h-8 w-8" />
                            <div className="flex-1">
                              <p className="font-semibold">{provider}</p>
                              <p className="text-xs text-default-500">
                                {isProviderKeySet(provider)
                                  ? "API key is set."
                                  : "Using default key."}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <Input
                              type={showApiKeys[provider] ? "text" : "password"}
                              label={`${provider} API Key`}
                              placeholder={`Enter your ${provider} API key`}
                              value={apiKeyInputs[provider] || ""}
                              onValueChange={(value) => handleApiKeyChange(provider, value)}
                              variant="bordered"
                              endContent={
                                <div className="flex items-center gap-2">
                                  <Button
                                    isIconOnly
                                    variant="light"
                                    size="sm"
                                    onPress={() => handleToggleShowApiKey(provider)}
                                  >
                                    {showApiKeys[provider] ? (
                                      <EyeSlashIcon className="h-5 w-5 text-default-500" />
                                    ) : (
                                      <EyeIcon className="h-5 w-5 text-default-500" />
                                    )}
                                  </Button>
                                </div>
                              }
                            />
                            <div className="mt-3 flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="flat"
                                color="primary"
                                onPress={() => handleSaveApiKey(provider)}
                                isDisabled={!apiKeyInputs[provider]?.trim()}
                              >
                                Save Key
                              </Button>
                              <Button
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => handleRemoveApiKey(provider)}
                                isDisabled={!isProviderKeySet(provider)}
                              >
                                Remove Key
                              </Button>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </Tab>

            <Tab key="general" title="General">
              <h3 className="mb-2 text-xl font-bold text-foreground">Interface Options</h3>
              <p className="mb-6 text-sm text-default-600">Customize how the interface behaves</p>
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
                  <Switch
                    isSelected={hidePersonalInfo}
                    onValueChange={(isSelected) => {
                      setHidePersonalInfo(isSelected);
                      addToast({
                        title: "Setting Changed",
                        description: `Personal information is now ${
                          isSelected ? "hidden" : "visible"
                        }.`,
                        color: "primary",
                      });
                    }}
                  />
                </div>

                <Divider />

                <div className="flex items-center justify-between rounded-xl border border-divider p-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground">
                      Show Sample Prompts
                    </label>
                    <p className="mt-1 text-sm text-default-600">
                      Show sample prompts on new chat screens
                    </p>
                  </div>
                  <Switch
                    isSelected={showSamplePrompts}
                    onValueChange={(isSelected) => {
                      setShowSamplePrompts(isSelected);
                      addToast({
                        title: "Setting Changed",
                        description: `Sample prompts are now ${isSelected ? "shown" : "hidden"}.`,
                        color: "primary",
                      });
                    }}
                  />
                </div>
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} size="md">
        <ModalContent>
          <ModalHeader>Confirm Deletion</ModalHeader>
          <ModalBody>
            <p className="text-default-700">
              Are you sure you want to delete{" "}
              {deleteTarget?.type === "multiple"
                ? `${deleteTarget.ids.length} file(s)`
                : "this file"}
              ? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteModalClose} disabled={isDeletingForModal}>
              Cancel
            </Button>
            <Button color="danger" onPress={handleConfirmDelete} isLoading={isDeletingForModal}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
