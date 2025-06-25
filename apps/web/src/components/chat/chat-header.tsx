"use client";

import { type ChatSession } from "@/services/chat-sessions";
import { Cog6ToothIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import {
  Button,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from "@heroui/react";
import { FileText, Palette, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { forwardRef } from "react";
import { ThemeSelector } from "../theme-selector";
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
    const router = useRouter();
    const handleOpenSettings = () => {
      router.push("/settings");
    };

    if (chatId === "new" || !sessionData) {
      return (
        <header
          ref={ref}
          className="flex h-14 shrink-0 items-center justify-end gap-1 border-b border-divider px-3 sm:h-16 sm:gap-2 sm:px-4"
        >
          {/* Hide theme selector on mobile, show only settings */}
          <div className="hidden sm:block">
            <ThemeSelector />
          </div>
          <Tooltip content="Settings" placement="bottom" delay={300}>
            <Button
              isIconOnly
              variant="light"
              size="sm"
              className="sm:size-md data-[hover=true]:bg-default-200"
              onPress={handleOpenSettings}
            >
              <Cog6ToothIcon className="h-4 w-4 text-default-600 sm:h-5 sm:w-5" />
            </Button>
          </Tooltip>
        </header>
      );
    }

    return (
      <header
        ref={ref}
        className="flex h-14 shrink-0 items-center justify-between border-b border-divider px-3 sm:h-16 sm:px-4"
      >
        <div className="flex flex-1 items-center justify-between">
          {/* Left side - Shared indicator */}
          <div className="flex min-w-0 flex-1 items-center">
            {isSharedView && (
              <Chip
                size="sm"
                variant="flat"
                color="primary"
                className="text-xs"
                startContent={
                  <svg
                    className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                }
              >
                <span className="hidden sm:inline">Shared</span>
                <span className="sm:hidden">Share</span>
              </Chip>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center">
            {/* Desktop: Show all buttons */}
            <div className="hidden items-center gap-2 sm:flex">
              <ThemeSelector />
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
              <Tooltip content="Settings" placement="bottom" delay={300}>
                <Button
                  isIconOnly
                  variant="light"
                  className="data-[hover=true]:bg-default-200"
                  onPress={handleOpenSettings}
                >
                  <Cog6ToothIcon className="h-5 w-5 text-default-600" />
                </Button>
              </Tooltip>
            </div>

            {/* Mobile: Show only essential buttons + dropdown for others */}
            <div className="flex items-center gap-1 sm:hidden">
              {/* Navigator button - always visible if needed */}
              {showNavigatorButton && (
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="data-[hover=true]:bg-default-200"
                  onPress={onToggleNavigator}
                  data-testid="chat-navigator-toggle"
                >
                  <FileText className="h-4 w-4 text-default-600" />
                </Button>
              )}

              {/* Settings - always visible */}
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="data-[hover=true]:bg-default-200"
                onPress={handleOpenSettings}
              >
                <Cog6ToothIcon className="h-4 w-4 text-default-600" />
              </Button>

              {/* More options dropdown */}
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    className="data-[hover=true]:bg-default-200"
                  >
                    <EllipsisHorizontalIcon className="h-4 w-4 text-default-600" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="More options">
                  <DropdownItem key="theme" startContent={<Palette className="h-4 w-4" />}>
                    <div className="flex w-full items-center justify-between">
                      <span>Theme</span>
                      <ThemeSelector />
                    </div>
                  </DropdownItem>
                  {!isSharedView ? (
                    <DropdownItem key="share" startContent={<Share2 className="h-4 w-4" />}>
                      <div className="flex w-full items-center justify-between">
                        <span>Share Chat</span>
                        <ShareButton session={sessionData} />
                      </div>
                    </DropdownItem>
                  ) : null}
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        </div>
      </header>
    );
  }
);

ChatHeader.displayName = "ChatHeader";
