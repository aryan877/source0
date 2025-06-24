"use client";

import { useMcpServers } from "@/hooks/queries/use-mcp-servers";
import { McpServerFormValues, mcpServerSchema } from "@/lib/validations/mcp-server";
import { McpServer } from "@/services/mcp-servers";
import {
  BoltIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CloudIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  PlusIcon,
  ServerIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
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
  Switch,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ZodError, type z } from "zod";

interface RadioCardProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

function RadioCard({
  id,
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon,
  recommended = false,
}: RadioCardProps) {
  return (
    <label
      htmlFor={id}
      className={`relative flex cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
        checked
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-default-200 bg-default-50 hover:border-default-300 hover:bg-default-100"
      } `}
    >
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />

      <div className="flex w-full items-start gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${checked ? "bg-primary text-primary-foreground" : "bg-default-200 text-default-600"} `}
        >
          {icon}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold ${checked ? "text-primary" : "text-foreground"}`}>
              {title}
            </h3>
            {recommended && (
              <Chip size="sm" color="success" variant="flat">
                Recommended
              </Chip>
            )}
          </div>
          <p className="mt-1 text-sm text-default-500">{description}</p>
        </div>

        <div
          className={`mt-1 h-4 w-4 rounded-full border-2 transition-colors ${
            checked ? "border-primary bg-primary" : "border-default-300 bg-transparent"
          } `}
        >
          {checked && <div className="h-full w-full scale-50 rounded-full bg-white" />}
        </div>
      </div>
    </label>
  );
}

// Common header presets
const HEADER_PRESETS = [
  { key: "Authorization", placeholder: "Bearer your-api-token-here" },
  { key: "X-API-Key", placeholder: "your-api-key-here" },
  { key: "Content-Type", placeholder: "application/json" },
  { key: "User-Agent", placeholder: "MyApp/1.0" },
  { key: "X-Custom-Header", placeholder: "custom-value" },
];

export function McpServersTab() {
  const {
    servers,
    createServer,
    updateServer,
    deleteServer,
    duplicateServer,
    toggleServerActive,
    isCreatingServer,
    isUpdatingServer,
    isDeletingServer,
    isDuplicatingServer,
    isTogglingServerActive,
    duplicatingServerId,
    togglingServerId,
  } = useMcpServers();

  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onOpenChange: onDeleteModalOpenChange,
  } = useDisclosure();
  const [serverToDelete, setServerToDelete] = useState<McpServer | null>(null);

  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [errors, setErrors] = useState<z.ZodFormattedError<McpServerFormValues> | null>(null);

  // Local UI state for header visibility
  const [visibleHeaders, setVisibleHeaders] = useState<Set<string>>(new Set());
  const [formVisibleHeaders, setFormVisibleHeaders] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    transport: "http" as "http" | "sse",
    headers: [] as { id: string; key: string; value: string }[],
    isActive: true,
  });

  const isAnyServerProcessing =
    isCreatingServer ||
    isUpdatingServer ||
    isDeletingServer ||
    isDuplicatingServer ||
    isTogglingServerActive;

  const activeServersCount = servers.filter((s) => s.is_active).length;

  const toggleServerExpanded = (serverId: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverId)) {
      newExpanded.delete(serverId);
    } else {
      newExpanded.add(serverId);
    }
    setExpandedServers(newExpanded);
  };

  const handleOpenChange = () => {
    onOpenChange();
    if (isOpen) {
      // Clear form visibility state when modal closes
      setFormVisibleHeaders(new Set());
      setErrors(null);
    }
  };

  const openAddModal = () => {
    setEditingServer(null);
    setFormData({
      name: "",
      url: "",
      transport: "http",
      headers: [],
      isActive: true,
    });
    setFormVisibleHeaders(new Set()); // Reset on open
    setErrors(null);
    onOpen();
  };

  const openEditModal = (server: McpServer) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      url: server.url,
      transport: server.transport as "http" | "sse",
      headers: [...server.headers],
      isActive: !!server.is_active,
    });
    setFormVisibleHeaders(new Set()); // Reset on open
    setErrors(null);
    onOpen();
  };

  const handleSubmit = () => {
    try {
      const validatedData = mcpServerSchema.parse(formData);
      setErrors(null);

      if (editingServer) {
        updateServer({
          id: editingServer.id,
          formData: {
            ...validatedData,
            name: validatedData.name.trim(),
            url: validatedData.url.trim(),
          },
        });
      } else {
        createServer({
          ...validatedData,
          name: validatedData.name.trim(),
          url: validatedData.url.trim(),
        });
      }
      handleOpenChange();
    } catch (error) {
      if (error instanceof ZodError) {
        setErrors(error.format());
      }
    }
  };

  const addFormHeader = (preset?: { key: string; placeholder: string }) => {
    const newHeader = {
      id: uuidv4(),
      key: preset?.key || "",
      value: "",
    };
    setFormData((prev) => ({
      ...prev,
      headers: [...prev.headers, newHeader],
    }));
  };

  const updateFormHeader = (headerId: string, field: "key" | "value", value: string) => {
    setFormData((prev) => ({
      ...prev,
      headers: prev.headers.map((header) =>
        header.id === headerId ? { ...header, [field]: value } : header
      ),
    }));
  };

  const removeFormHeader = (headerId: string) => {
    setFormData((prev) => ({
      ...prev,
      headers: prev.headers.filter((header) => header.id !== headerId),
    }));
  };

  const createVisiblityToggler =
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) => {
      setter((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    };

  const toggleListItemVisibility = createVisiblityToggler(setVisibleHeaders);
  const toggleFormItemVisibility = createVisiblityToggler(setFormVisibleHeaders);

  const isSensitiveHeader = (key: string) => {
    const lowerKey = key.toLowerCase();
    return (
      lowerKey.includes("auth") ||
      lowerKey.includes("token") ||
      lowerKey.includes("key") ||
      lowerKey.includes("secret")
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4 sm:flex sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-foreground">MCP Servers</h2>
          <p className="text-sm text-default-500">
            Configure Model Context Protocol servers for enhanced AI capabilities
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip variant="flat" color="success" size="sm">
            {activeServersCount} active
          </Chip>
          <Chip variant="flat" color="default" size="sm">
            {servers.length} total
          </Chip>
          <Button
            color="primary"
            startContent={<PlusIcon className="h-4 w-4" />}
            onPress={openAddModal}
            isDisabled={isAnyServerProcessing}
            isLoading={isCreatingServer}
            size="sm"
            className="sm:size-medium"
          >
            <span className="hidden sm:inline">Add Server</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Server List */}
      <div className="space-y-4">
        {servers.length === 0 ? (
          <Card className="border-dashed">
            <CardBody className="py-12 text-center">
              <ServerIcon className="mx-auto h-12 w-12 text-default-300" />
              <h3 className="mt-4 text-lg font-medium text-default-600">
                No MCP servers configured
              </h3>
              <p className="mt-2 text-sm text-default-400">
                Add your first MCP server to get started with enhanced AI capabilities
              </p>
              <Button
                color="primary"
                variant="flat"
                className="mt-4"
                startContent={<PlusIcon className="h-4 w-4" />}
                onPress={openAddModal}
                isDisabled={isAnyServerProcessing}
                isLoading={isCreatingServer}
              >
                Add Your First Server
              </Button>
            </CardBody>
          </Card>
        ) : (
          servers.map((server) => {
            const isToggling = togglingServerId === server.id;
            const isDuplicating = duplicatingServerId === server.id;
            const isCurrentServerProcessing = isToggling || isDuplicating || isDeletingServer;

            return (
              <Card
                key={server.id}
                className={`border transition-all duration-200 ${
                  server.is_active
                    ? "border-success-200 bg-success-50/30"
                    : "border-default-200 bg-default-50/50"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="space-y-3 sm:flex sm:w-full sm:items-center sm:justify-between sm:space-y-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          server.is_active ? "bg-success-100" : "bg-default-100"
                        }`}
                      >
                        <ServerIcon
                          className={`h-5 w-5 ${
                            server.is_active ? "text-success-600" : "text-default-600"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <h3 className="truncate font-semibold text-foreground">{server.name}</h3>
                          <Switch
                            size="sm"
                            isSelected={!!server.is_active}
                            onValueChange={() =>
                              toggleServerActive({ id: server.id, currentServer: server })
                            }
                            isDisabled={isCurrentServerProcessing}
                            classNames={{
                              base: "max-w-fit",
                            }}
                          />
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-default-500 sm:flex-row sm:items-center sm:gap-2">
                          <div className="flex items-center gap-1">
                            <GlobeAltIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate font-mono text-xs">{server.url}</span>
                          </div>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={server.transport === "sse" ? "success" : "primary"}
                          >
                            {server.transport.toUpperCase()}
                          </Chip>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1 sm:flex-shrink-0">
                      <Tooltip content="Duplicate Server">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => duplicateServer(server.id)}
                          isDisabled={isCurrentServerProcessing}
                          isLoading={isDuplicating}
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Edit Server">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => openEditModal(server)}
                          isDisabled={isCurrentServerProcessing}
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content={expandedServers.has(server.id) ? "Collapse" : "Expand"}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => toggleServerExpanded(server.id)}
                          isDisabled={isCurrentServerProcessing}
                        >
                          {expandedServers.has(server.id) ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </Tooltip>
                      <Tooltip content="Delete Server" color="danger">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => {
                            setServerToDelete(server);
                            onDeleteModalOpen();
                          }}
                          isDisabled={isCurrentServerProcessing}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {expandedServers.has(server.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <CardBody className="pt-0">
                        <Divider className="mb-4" />
                        <div className="space-y-3">
                          <h4 className="flex items-center gap-2 font-medium text-foreground">
                            <Cog6ToothIcon className="h-4 w-4" />
                            HTTP Headers
                            <Chip size="sm" variant="flat" color="default">
                              {server.headers.length}
                            </Chip>
                          </h4>
                          {server.headers.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-default-200 p-4 text-center">
                              <p className="text-sm text-default-400">No headers configured</p>
                              <p className="text-xs text-default-300">
                                Add authentication headers or custom headers for your MCP server
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {server.headers.map((header) => (
                                <div
                                  key={header.id}
                                  className="flex items-center gap-2 rounded-lg bg-default-50 p-3"
                                >
                                  <code className="min-w-fit font-mono text-xs text-primary">
                                    {header.key}:
                                  </code>
                                  <div className="flex flex-1 items-center gap-2">
                                    <code className="flex-1 break-all font-mono text-xs text-default-600">
                                      {visibleHeaders.has(header.id) ||
                                      !isSensitiveHeader(header.key)
                                        ? header.value
                                        : "•".repeat(
                                            Math.min(header.value ? header.value.length : 0, 20)
                                          )}
                                    </code>
                                    {isSensitiveHeader(header.key) && (
                                      <Tooltip
                                        content={
                                          visibleHeaders.has(header.id)
                                            ? "Hide Value"
                                            : "Show Value"
                                        }
                                      >
                                        <Button
                                          isIconOnly
                                          size="sm"
                                          variant="light"
                                          onPress={() => toggleListItemVisibility(header.id)}
                                        >
                                          {visibleHeaders.has(header.id) ? (
                                            <EyeSlashIcon className="h-4 w-4" />
                                          ) : (
                                            <EyeIcon className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardBody>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onOpenChange={handleOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {editingServer ? "Edit MCP Server" : "Add New MCP Server"}
                  <Switch
                    size="sm"
                    isSelected={formData.isActive}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, isActive: value }))}
                    classNames={{
                      base: "max-w-fit",
                    }}
                  >
                    Active
                  </Switch>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Server Name"
                      placeholder="My Production MCP Server"
                      value={formData.name}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
                      description="A friendly name for your server"
                      isRequired
                      isInvalid={!!errors?.name}
                      errorMessage={errors?.name?._errors[0]}
                    />
                    <Input
                      label="Server URL"
                      placeholder="https://api.example.com/mcp"
                      value={formData.url}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, url: value }))}
                      description="The full URL to your MCP server"
                      isRequired
                      isInvalid={!!errors?.url}
                      errorMessage={errors?.url?._errors[0]}
                    />
                  </div>

                  {/* Transport Type */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Transport Type</h3>
                      <p className="text-xs text-default-500">
                        Choose how to connect to your MCP server
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <RadioCard
                        id="transport-http"
                        name="transport"
                        value="http"
                        checked={formData.transport === "http"}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, transport: value as "http" | "sse" }))
                        }
                        title="HTTP"
                        description="Standard Request/Response and Streamable HTTP"
                        icon={<CloudIcon className="h-5 w-5" />}
                      />

                      <RadioCard
                        id="transport-sse"
                        name="transport"
                        value="sse"
                        checked={formData.transport === "sse"}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, transport: value as "http" | "sse" }))
                        }
                        title="SSE"
                        description="Server-Sent Events"
                        icon={<BoltIcon className="h-5 w-5" />}
                      />
                    </div>

                    <p className="text-xs text-default-400">
                      Choose the transport method that best fits your MCP server implementation
                    </p>
                  </div>

                  {/* Headers */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">HTTP Headers</h3>
                        <p className="text-xs text-default-500">
                          Add authentication headers or custom headers
                        </p>
                      </div>
                      <Dropdown>
                        <DropdownTrigger>
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            startContent={<PlusIcon className="h-4 w-4" />}
                          >
                            Add Header
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                          onAction={(key) => {
                            if (key === "custom") {
                              addFormHeader();
                            } else {
                              const preset = HEADER_PRESETS.find((p) => p.key === key);
                              if (preset) addFormHeader(preset);
                            }
                          }}
                        >
                          <DropdownItem key="Authorization">Authorization</DropdownItem>
                          <DropdownItem key="X-API-Key">X-API-Key</DropdownItem>
                          <DropdownItem key="Content-Type">Content-Type</DropdownItem>
                          <DropdownItem key="User-Agent">User-Agent</DropdownItem>
                          <DropdownItem key="X-Custom-Header">X-Custom-Header</DropdownItem>
                          <DropdownItem key="custom">Custom Header</DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>

                    {formData.headers.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-default-200 p-6 text-center">
                        <Cog6ToothIcon className="mx-auto h-8 w-8 text-default-300" />
                        <h4 className="mt-2 font-medium text-default-600">No headers configured</h4>
                        <p className="mt-1 text-sm text-default-400">
                          Add authentication headers or custom headers for your MCP server
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.headers.map((header, index) => {
                          const placeholder =
                            HEADER_PRESETS.find((p) => p.key === header.key)?.placeholder ||
                            "header-value";
                          return (
                            <div
                              key={header.id}
                              className="rounded-lg border border-default-200 p-4"
                            >
                              <div className="flex gap-3">
                                <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                                  <Input
                                    label={`Header Key ${index + 1}`}
                                    placeholder="Authorization"
                                    value={header.key}
                                    onValueChange={(value) =>
                                      updateFormHeader(header.id, "key", value)
                                    }
                                    size="sm"
                                    isInvalid={!!errors?.headers?.[index]?.key}
                                    errorMessage={errors?.headers?.[index]?.key?._errors[0]}
                                  />
                                  <div className="flex gap-2">
                                    <Input
                                      label={`Header Value ${index + 1}`}
                                      placeholder={placeholder}
                                      value={header.value}
                                      onValueChange={(value) =>
                                        updateFormHeader(header.id, "value", value)
                                      }
                                      isInvalid={!!errors?.headers?.[index]?.value}
                                      errorMessage={errors?.headers?.[index]?.value?._errors[0]}
                                      type={
                                        !formVisibleHeaders.has(header.id) &&
                                        isSensitiveHeader(header.key)
                                          ? "password"
                                          : "text"
                                      }
                                      size="sm"
                                      className="flex-1"
                                      endContent={
                                        isSensitiveHeader(header.key) ? (
                                          <Tooltip
                                            content={
                                              formVisibleHeaders.has(header.id)
                                                ? "Hide Value"
                                                : "Show Value"
                                            }
                                          >
                                            <Button
                                              isIconOnly
                                              size="sm"
                                              variant="light"
                                              onPress={() => toggleFormItemVisibility(header.id)}
                                            >
                                              {formVisibleHeaders.has(header.id) ? (
                                                <EyeSlashIcon className="h-4 w-4" />
                                              ) : (
                                                <EyeIcon className="h-4 w-4" />
                                              )}
                                            </Button>
                                          </Tooltip>
                                        ) : null
                                      }
                                    />
                                    <div className="flex items-end pb-1">
                                      <Tooltip content="Remove Header" color="danger">
                                        <Button
                                          isIconOnly
                                          size="sm"
                                          variant="light"
                                          color="danger"
                                          onPress={() => removeFormHeader(header.id)}
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </Button>
                                      </Tooltip>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleSubmit}
                  isLoading={isUpdatingServer || isCreatingServer}
                >
                  {editingServer ? "Update Server" : "Add Server"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onOpenChange={onDeleteModalOpenChange} size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Confirm Deletion</ModalHeader>
              <ModalBody>
                <p>
                  Are you sure you want to delete the server{" "}
                  <span className="font-bold">{serverToDelete?.name}</span>?
                </p>
                <p className="text-sm text-default-500">This action cannot be undone.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={isDeletingServer}>
                  Cancel
                </Button>
                <Button
                  color="danger"
                  isLoading={isDeletingServer}
                  onPress={() => {
                    if (serverToDelete) {
                      deleteServer({ id: serverToDelete.id, name: serverToDelete.name });
                    }
                    onClose();
                  }}
                >
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
