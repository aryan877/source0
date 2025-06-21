import { type ChatSession } from "@/services/chat-sessions";
import { Button, Chip, Tooltip } from "@heroui/react";
import { FileText } from "lucide-react";
import { forwardRef } from "react";
import { ShareButton } from "./share-button";

interface ChatHeaderProps {
  chatId: string;
  sessionData?: ChatSession;
  isSharedView?: boolean;
  showNavigatorButton?: boolean;
  onToggleNavigator?: () => void;
}

export const ChatHeader = forwardRef<HTMLDivElement, ChatHeaderProps>(
  (
    { chatId, sessionData, isSharedView = false, showNavigatorButton = false, onToggleNavigator },
    ref
  ) => {
    if (chatId === "new" || !sessionData) {
      return (
        <header
          ref={ref}
          className="flex h-16 shrink-0 items-center justify-between border-b border-divider px-4"
        />
      );
    }

    return (
      <header
        ref={ref}
        className="flex h-16 shrink-0 items-center justify-between border-b border-divider px-4"
      >
        <div className="flex flex-1 items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {isSharedView && (
              <Chip
                size="sm"
                variant="flat"
                color="primary"
                startContent={
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                }
              >
                Shared
              </Chip>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showNavigatorButton && (
              <Tooltip content="Chat Navigator" placement="bottom" delay={300}>
                <Button
                  isIconOnly
                  variant="light"
                  className="data-[hover=true]:bg-default-200"
                  onPress={onToggleNavigator}
                  data-testid="chat-navigator-toggle"
                >
                  <FileText className="h-5 w-5 text-default-600" />
                </Button>
              </Tooltip>
            )}
            {!isSharedView && (
              <Tooltip content="Share Chat" placement="bottom" delay={300}>
                <ShareButton session={sessionData} />
              </Tooltip>
            )}
          </div>
        </div>
      </header>
    );
  }
);

ChatHeader.displayName = "ChatHeader";
