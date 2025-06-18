import { type ChatSession } from "@/services/chat-sessions";
import { Chip } from "@heroui/react";
import { ShareButton } from "./share-button";

interface ChatHeaderProps {
  chatId: string;
  sessionData?: ChatSession;
  isSharedView?: boolean;
}

export function ChatHeader({ chatId, sessionData, isSharedView = false }: ChatHeaderProps) {
  if (chatId === "new" || !sessionData) {
    return null;
  }

  return (
    <div className="flex items-center justify-between bg-background/60 px-4 py-3 backdrop-blur-sm">
      <div className="flex-1">
        <div className="flex items-center gap-3">
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
      </div>
      <div className="flex items-center gap-2">
        {!isSharedView && <ShareButton session={sessionData} />}
      </div>
    </div>
  );
}
