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
          className="flex h-10 shrink-0 items-center justify-end gap-2 bg-gradient-to-r from-transparent via-content2/30 to-content2/50 px-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-1">
            <div className="hidden sm:block">
              <ThemeSelector />
            </div>
            <Tooltip content="Settings" placement="bottom" delay={300}>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="h-7 w-7 data-[hover=true]:bg-default-200/70"
                onPress={handleOpenSettings}
              >
                <Cog6ToothIcon className="h-3.5 w-3.5 text-default-600" />
              </Button>
            </Tooltip>
          </div>
        </header>
      );
    }

    return (
      <header
        ref={ref}
        className="flex h-10 shrink-0 items-center justify-between bg-gradient-to-r from-transparent via-content2/30 to-content2/50 px-4 backdrop-blur-sm"
      >
        <div className="flex flex-1 items-center justify-between">
          {/* Left side - Shared indicator */}
          <div className="flex min-w-0 flex-1 items-center">
            {isSharedView && (
              <Chip
                size="sm"
                variant="flat"
                color="primary"
                className="h-6 text-xs"
                startContent={
                  <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
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
            <div className="hidden items-center gap-1 sm:flex">
              <ThemeSelector />
              {showNavigatorButton && (
                <Tooltip content="Chat Navigator" placement="bottom" delay={300}>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    className="h-7 w-7 data-[hover=true]:bg-default-200/70"
                    onPress={onToggleNavigator}
                    data-testid="chat-navigator-toggle"
                  >
                    <FileText className="h-3.5 w-3.5 text-default-600" />
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
                  size="sm"
                  className="h-7 w-7 data-[hover=true]:bg-default-200/70"
                  onPress={handleOpenSettings}
                >
                  <Cog6ToothIcon className="h-3.5 w-3.5 text-default-600" />
                </Button>
              </Tooltip>
            </div>

            {/* Mobile: Compact button layout */}
            <div className="flex items-center gap-0.5 sm:hidden">
              {/* Navigator button - always visible if needed */}
              {showNavigatorButton && (
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="h-6 w-6 data-[hover=true]:bg-default-200/70"
                  onPress={onToggleNavigator}
                  data-testid="chat-navigator-toggle"
                >
                  <FileText className="h-3 w-3 text-default-600" />
                </Button>
              )}

              {/* Settings - always visible */}
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="h-6 w-6 data-[hover=true]:bg-default-200/70"
                onPress={handleOpenSettings}
              >
                <Cog6ToothIcon className="h-3 w-3 text-default-600" />
              </Button>

              {/* More options dropdown */}
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    className="h-6 w-6 data-[hover=true]:bg-default-200/70"
                  >
                    <EllipsisHorizontalIcon className="h-3 w-3 text-default-600" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="More options" className="min-w-[200px]">
                  <DropdownItem
                    key="theme"
                    startContent={<Palette className="h-3.5 w-3.5" />}
                    className="py-2"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-sm">Theme</span>
                      <div className="ml-4">
                        <ThemeSelector />
                      </div>
                    </div>
                  </DropdownItem>
                  {!isSharedView ? (
                    <DropdownItem
                      key="share"
                      startContent={<Share2 className="h-3.5 w-3.5" />}
                      className="py-2"
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm">Share Chat</span>
                        <div className="ml-4">
                          <ShareButton session={sessionData} />
                        </div>
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
