import {
  ArrowLeftIcon,
  BoltIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Switch,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { useState } from "react";

interface SettingsProps {
  onBack: () => void;
}

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  chatTitle: string;
  uploadDate: string;
}

const mockAttachments: AttachedFile[] = [
  {
    id: "1",
    name: "design-mockup.png",
    type: "image/png",
    size: 2457600,
    chatTitle: "UI Design Discussion",
    uploadDate: "2024-01-15",
  },
  {
    id: "2",
    name: "requirements.pdf",
    type: "application/pdf",
    size: 1048576,
    chatTitle: "Project Planning",
    uploadDate: "2024-01-14",
  },
  {
    id: "3",
    name: "code-snippet.txt",
    type: "text/plain",
    size: 5120,
    chatTitle: "React Best Practices",
    uploadDate: "2024-01-13",
  },
];

const models = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", isFree: true, enabled: true },
  { id: "gpt-4.5", name: "GPT-4.5", isFree: false, enabled: true },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", isFree: false, enabled: true },
  { id: "claude-4-opus", name: "Claude 4 Opus", isFree: false, enabled: false },
  { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet", isFree: false, enabled: true },
  { id: "deepseek-chat", name: "DeepSeek Chat", isFree: false, enabled: false },
  { id: "deepseek-v2", name: "DeepSeek V2", isFree: false, enabled: true },
];

export const Settings = ({ onBack }: SettingsProps) => {
  const [assistantName, setAssistantName] = useState("AI Assistant");
  const [userTraits, setUserTraits] = useState(
    "I prefer concise responses and enjoy technical discussions."
  );
  const [theme, setTheme] = useState("system");
  const [showStats, setShowStats] = useState(false);
  const [hidePersonalInfo, setHidePersonalInfo] = useState(false);
  const [disableBreaks, setDisableBreaks] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>(mockAttachments);
  const [apiKeys, setApiKeys] = useState<Record<string, { value: string; visible: boolean }>>({
    "gpt-4.5": { value: "", visible: false },
    "claude-4-opus": { value: "", visible: false },
    "deepseek-chat": { value: "", visible: false },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const toggleApiKeyVisibility = (modelId: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [modelId]: {
        value: prev[modelId]?.value || "",
        visible: !prev[modelId]?.visible,
      },
    }));
  };

  const updateApiKey = (modelId: string, value: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [modelId]: {
        value,
        visible: prev[modelId]?.visible || false,
      },
    }));
  };

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Header */}
      <div className="border-divider bg-content1 flex items-center gap-4 border-b p-6">
        <Button variant="light" isIconOnly onPress={onBack}>
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-foreground text-2xl font-bold">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6">
          <Tabs
            defaultSelectedKey="customization"
            className="w-full"
            classNames={{
              base: "w-full",
              tabList: "w-full",
              panel: "pt-6",
              tabContent: "group-data-[selected=true]:text-primary",
            }}
          >
            <Tab key="customization" title="Customization">
              <div className="space-y-6 pb-8">
                <Card>
                  <CardHeader>
                    <h3 className="text-foreground text-xl font-bold">Personal Settings</h3>
                  </CardHeader>
                  <CardBody className="space-y-6">
                    <div>
                      <label className="text-foreground mb-3 block text-sm font-semibold">
                        Assistant Name
                      </label>
                      <Input
                        value={assistantName}
                        onChange={(e) => setAssistantName(e.target.value)}
                        placeholder="What should this app call you?"
                        variant="bordered"
                      />
                      <p className="text-default-600 mt-2 text-sm">
                        This is how the assistant will address you in conversations.
                      </p>
                    </div>

                    <div>
                      <label className="text-foreground mb-3 block text-sm font-semibold">
                        Your Traits & Preferences
                      </label>
                      <Textarea
                        value={userTraits}
                        onChange={(e) => setUserTraits(e.target.value)}
                        placeholder="Tell the AI about your preferences, communication style, expertise, etc."
                        minRows={4}
                        variant="bordered"
                      />
                      <p className="text-default-600 mt-2 text-sm">
                        Help the AI understand how to communicate with you effectively.
                      </p>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-foreground text-xl font-bold">Appearance</h3>
                  </CardHeader>
                  <CardBody className="space-y-6">
                    <div>
                      <label className="text-foreground mb-4 block text-sm font-semibold">
                        Theme
                      </label>
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

                    <div className="border-divider flex items-center justify-between rounded-xl border p-4">
                      <div>
                        <label className="text-foreground text-sm font-semibold">
                          Advanced Stats
                        </label>
                        <p className="text-default-600 mt-1 text-sm">
                          Show tokens per second, latency, and other metrics
                        </p>
                      </div>
                      <Switch isSelected={showStats} onValueChange={setShowStats} />
                    </div>
                  </CardBody>
                </Card>
              </div>
            </Tab>

            <Tab key="models" title="Models">
              <div className="space-y-6 pb-8">
                <Card>
                  <CardHeader>
                    <div>
                      <h3 className="text-foreground text-xl font-bold">Available Models</h3>
                      <p className="text-default-600 mt-2 text-sm">
                        Enable or disable specific models and configure API keys
                      </p>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    {models.map((model) => (
                      <Card key={model.id} className="border-divider border">
                        <CardBody className="p-6">
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="bg-content2 rounded-xl p-3">
                                {model.isFree ? (
                                  <BoltIcon className="text-success h-6 w-6" />
                                ) : (
                                  <LockClosedIcon className="text-default-400 h-6 w-6" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-3">
                                  <span className="text-foreground font-semibold">
                                    {model.name}
                                  </span>
                                  {model.isFree && (
                                    <Chip color="success" variant="flat" size="sm">
                                      Free
                                    </Chip>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Switch isSelected={model.enabled} />
                          </div>

                          {!model.isFree && (
                            <div className="space-y-3">
                              <label className="text-foreground text-sm font-semibold">
                                API Key
                              </label>
                              <div className="flex gap-3">
                                <Input
                                  type={apiKeys[model.id]?.visible ? "text" : "password"}
                                  value={apiKeys[model.id]?.value || ""}
                                  onChange={(e) => updateApiKey(model.id, e.target.value)}
                                  placeholder="Enter API key..."
                                  className="flex-1"
                                  variant="bordered"
                                />
                                <Button
                                  variant="bordered"
                                  isIconOnly
                                  onPress={() => toggleApiKeyVisibility(model.id)}
                                >
                                  {apiKeys[model.id]?.visible ? (
                                    <EyeSlashIcon className="h-5 w-5" />
                                  ) : (
                                    <EyeIcon className="h-5 w-5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    ))}
                  </CardBody>
                </Card>
              </div>
            </Tab>

            <Tab key="attachments" title="Attachments">
              <div className="space-y-6 pb-8">
                <Card>
                  <CardHeader>
                    <div>
                      <h3 className="text-foreground text-xl font-bold">Uploaded Attachments</h3>
                      <p className="text-default-600 mt-2 text-sm">
                        Manage all files you&apos;ve uploaded across chats
                      </p>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {attachments.length === 0 ? (
                      <div className="py-16 text-center">
                        <div className="mb-4 text-6xl">📎</div>
                        <p className="text-default-500 font-medium">No attachments found</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {attachments.map((file, index) => (
                          <div key={file.id}>
                            <div className="bg-content1 border-divider flex items-center justify-between rounded-xl border p-4">
                              <div className="flex items-center gap-4">
                                <div className="bg-content2 flex h-12 w-12 items-center justify-center rounded-xl text-xl">
                                  {file.type.startsWith("image/") ? "🖼️" : "📄"}
                                </div>
                                <div>
                                  <p className="text-foreground font-semibold">{file.name}</p>
                                  <div className="text-default-600 flex items-center gap-2 text-sm">
                                    <span className="font-medium">{formatFileSize(file.size)}</span>
                                    <span>•</span>
                                    <span>{file.chatTitle}</span>
                                    <span>•</span>
                                    <span>{file.uploadDate}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="light"
                                isIconOnly
                                color="danger"
                                onPress={() =>
                                  setAttachments((prev) => prev.filter((a) => a.id !== file.id))
                                }
                              >
                                <TrashIcon className="h-5 w-5" />
                              </Button>
                            </div>
                            {index < attachments.length - 1 && <Divider className="my-2" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            </Tab>

            <Tab key="general" title="General">
              <div className="space-y-6 pb-8">
                <Card>
                  <CardHeader>
                    <div>
                      <h3 className="text-foreground text-xl font-bold">Interface Options</h3>
                      <p className="text-default-600 mt-2 text-sm">
                        Customize how the interface behaves
                      </p>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-6">
                    <div className="border-divider flex items-center justify-between rounded-xl border p-4">
                      <div>
                        <label className="text-foreground text-sm font-semibold">
                          Hide Personal Information
                        </label>
                        <p className="text-default-600 mt-1 text-sm">
                          Hide name and email from the interface
                        </p>
                      </div>
                      <Switch isSelected={hidePersonalInfo} onValueChange={setHidePersonalInfo} />
                    </div>

                    <Divider />

                    <div className="border-divider flex items-center justify-between rounded-xl border p-4">
                      <div>
                        <label className="text-foreground text-sm font-semibold">
                          Disable Horizontal Breaks
                        </label>
                        <p className="text-default-600 mt-1 text-sm">
                          Remove separator lines between messages
                        </p>
                      </div>
                      <Switch isSelected={disableBreaks} onValueChange={setDisableBreaks} />
                    </div>
                  </CardBody>
                </Card>
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
