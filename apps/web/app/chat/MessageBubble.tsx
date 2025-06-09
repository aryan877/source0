import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { Avatar, Button, Card, CardBody, Tooltip } from "@heroui/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
  isStreaming?: boolean;
  attachments?: File[];
}

interface MessageBubbleProps {
  message: Message;
  onRetry: (messageId: string) => void;
  onFork: (messageId: string) => void;
}

export const MessageBubble = ({ message, onRetry, onFork }: MessageBubbleProps) => {
  const [showActions, setShowActions] = useState(false);
  const isUser = message.sender === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div
      className={`group flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar
          size="sm"
          name={isUser ? "U" : "AI"}
          getInitials={(name) => name}
          color={isUser ? "primary" : "secondary"}
          fallback={isUser ? <UserIcon className="h-5 w-5" /> : "AI"}
        />
      </div>

      {/* Message Content */}
      <div className={`flex max-w-[75%] flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        <Card className={isUser ? "bg-primary" : "bg-content2"}>
          <CardBody className="px-6 py-4">
            {/* File Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-4 space-y-2">
                {message.attachments.map((file, index) => (
                  <div key={index} className="bg-content1 flex items-center gap-3 rounded-xl p-3">
                    <div className="bg-content2 flex h-10 w-10 items-center justify-center rounded-lg text-lg">
                      📎
                    </div>
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Message Text */}
            <div
              className={`prose prose-sm max-w-none ${isUser ? "text-white" : "text-foreground"}`}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p
                      className={`mb-2 leading-relaxed last:mb-0 ${isUser ? "text-white" : "text-foreground"}`}
                    >
                      {children}
                    </p>
                  ),
                  code: ({ children }) => (
                    <code
                      className={`rounded px-1.5 py-0.5 font-mono text-sm ${
                        isUser ? "bg-white/20 text-white" : "bg-content3 text-foreground"
                      }`}
                    >
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre
                      className={`overflow-x-auto rounded-lg p-3 ${
                        isUser ? "bg-white/20 text-white" : "bg-content3 text-foreground"
                      }`}
                    >
                      {children}
                    </pre>
                  ),
                  strong: ({ children }) => (
                    <strong
                      className={
                        isUser ? "font-semibold text-white" : "text-foreground font-semibold"
                      }
                    >
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className={isUser ? "text-white/90" : "text-foreground/90"}>{children}</em>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Streaming Indicator */}
            {message.isStreaming && (
              <div className="mt-3 flex items-center gap-1.5">
                <div
                  className={`h-1.5 w-1.5 animate-pulse rounded-full ${isUser ? "bg-white/60" : "bg-current"} opacity-60`}
                />
                <div
                  className={`h-1.5 w-1.5 animate-pulse rounded-full ${isUser ? "bg-white/60" : "bg-current"} opacity-60 delay-100`}
                />
                <div
                  className={`h-1.5 w-1.5 animate-pulse rounded-full ${isUser ? "bg-white/60" : "bg-current"} opacity-60 delay-200`}
                />
              </div>
            )}
          </CardBody>
        </Card>

        {/* Timestamp and Actions */}
        <div className={`flex items-center gap-3 px-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-default-500 text-xs">{message.timestamp}</span>

          {(showActions || message.isStreaming === false) && !isUser && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Tooltip content="Retry message" placement="top" delay={500}>
                <Button variant="light" size="sm" isIconOnly onPress={() => onRetry(message.id)}>
                  <ArrowPathIcon className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Copy message" placement="top" delay={500}>
                <Button variant="light" size="sm" isIconOnly onPress={handleCopy}>
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Fork from here" placement="top" delay={500}>
                <Button variant="light" size="sm" isIconOnly onPress={() => onFork(message.id)}>
                  <CodeBracketIcon className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
