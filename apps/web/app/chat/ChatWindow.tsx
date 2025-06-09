import {
  ChevronDownIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  ScrollShadow,
  Textarea,
} from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { FileAttachment } from "./FileAttachment";
import { MessageBubble } from "./MessageBubble";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
  isStreaming?: boolean;
  attachments?: File[];
}

interface ChatWindowProps {
  chatId: string;
}

const models = [
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gpt-4", name: "GPT-4" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
];

export const ChatWindow = ({ chatId }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      sender: "ai",
      timestamp: "10:30 AM",
    },
  ]);
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-pro");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update messages when chatId changes to simulate chat navigation
  useEffect(() => {
    // Simulate different chat content based on chatId
    const chatMessages: Record<string, Message[]> = {
      "1": [
        {
          id: "1",
          content: "Hello! I'm your AI assistant. How can I help you today?",
          sender: "ai",
          timestamp: "10:30 AM",
        },
      ],
      "2": [
        {
          id: "1",
          content: "Let's discuss React best practices!",
          sender: "ai",
          timestamp: "9:15 AM",
        },
      ],
      "3": [
        {
          id: "1",
          content: "I'm here to help with TypeScript questions.",
          sender: "ai",
          timestamp: "8:45 AM",
        },
      ],
    };

    setMessages(
      chatMessages[chatId] || [
        {
          id: "1",
          content: "Hello! I'm your AI assistant. How can I help you today?",
          sender: "ai",
          timestamp: "10:30 AM",
        },
      ]
    );
  }, [chatId]);

  const handleSendMessage = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachedFiles([]);
    setIsGenerating(true);

    // Simulate AI response with streaming
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "",
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Simulate streaming response
      const fullResponse =
        "I understand you'd like help with that. Let me provide you with a detailed response that addresses your question comprehensively. This is a simulated streaming response that demonstrates how the AI would respond in real-time.";

      let currentText = "";
      fullResponse.split("").forEach((char, index) => {
        setTimeout(() => {
          currentText += char;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessage.id
                ? { ...msg, content: currentText, isStreaming: index < fullResponse.length - 1 }
                : msg
            )
          );

          if (index === fullResponse.length - 1) {
            setIsGenerating(false);
          }
        }, index * 50);
      });
    }, 1000);
  };

  const handleFileAttach = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRetryMessage = (messageId: string) => {
    console.log("Retrying message:", messageId);
  };

  const handleForkChat = (messageId: string) => {
    console.log("Forking chat from message:", messageId);
  };

  const selectedModelName = models.find((m) => m.id === selectedModel)?.name || "Gemini 2.5 Pro";

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <ScrollShadow className="flex-1">
        <div className="mx-auto max-w-4xl space-y-6 p-6">
          {messages.map((message) => (
            <div key={message.id}>
              <MessageBubble
                message={message}
                onRetry={handleRetryMessage}
                onFork={handleForkChat}
              />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollShadow>

      {/* File Attachments */}
      {attachedFiles.length > 0 && (
        <div className="border-divider border-t px-6 py-4">
          <FileAttachment
            files={attachedFiles}
            onRemove={(index) => setAttachedFiles((prev) => prev.filter((_, i) => i !== index))}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="bg-content1 border-divider border-t p-6">
        <div className="mx-auto max-w-4xl">
          <div className="border-default-200 bg-content2 flex items-end gap-3 rounded-2xl border p-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileAttach}
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="hidden"
            />

            {/* Textarea Field */}
            <div className="flex-1">
              <Textarea
                value={input}
                onValueChange={setInput}
                placeholder="Type your message here..."
                variant="flat"
                minRows={1}
                maxRows={10}
                classNames={{
                  base: "w-full",
                  inputWrapper:
                    "bg-transparent shadow-none border-none data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent",
                  input: "text-base resize-none",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                isDisabled={isGenerating}
              />
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2">
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    variant="flat"
                    size="sm"
                    color="primary"
                    className="h-8 px-3"
                    endContent={<ChevronDownIcon className="h-3 w-3" />}
                  >
                    {selectedModelName}
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  selectedKeys={[selectedModel]}
                  selectionMode="single"
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;
                    setSelectedModel(selectedKey);
                  }}
                >
                  {models.map((model) => (
                    <DropdownItem key={model.id}>{model.name}</DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>

              <Button variant="flat" size="sm" className="h-8 px-3">
                Medium
              </Button>

              <Button variant="flat" size="sm" className="h-8 px-3">
                Search
              </Button>

              <Button
                variant="flat"
                size="sm"
                isIconOnly
                className="h-8 w-8"
                onPress={() => fileInputRef.current?.click()}
              >
                <PaperClipIcon className="h-4 w-4" />
              </Button>

              <Button
                onPress={handleSendMessage}
                isDisabled={(!input.trim() && attachedFiles.length === 0) || isGenerating}
                isIconOnly
                color="primary"
                size="sm"
                className="h-8 w-8"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating New Chat Button (Mobile) */}
      <Button
        className="fixed bottom-6 right-6 z-50 lg:hidden"
        isIconOnly
        color="primary"
        size="lg"
        radius="full"
      >
        <PlusIcon className="h-7 w-7" />
      </Button>
    </div>
  );
};
