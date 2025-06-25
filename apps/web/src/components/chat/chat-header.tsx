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
import { FileText, Palette } from "lucide-react";
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

// Clean individual button styling
const headerButtonClass = "h-8 w-8 bg-content1/90 hover:bg-content2 transition-colors";
const iconClass = "h-4 w-4 text-default-700";

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
        <header ref={ref} className="absolute right-4 top-2 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2">
            {/* Desktop theme button */}
            <div className="hidden sm:block">
              <Tooltip content="Change Theme" placement="bottom" delay={100} closeDelay={0}>
                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <Button isIconOnly variant="flat" size="sm" className={headerButtonClass}>
                      <Palette className={iconClass} />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Theme options" className="min-w-[200px]">
                    <DropdownItem key="theme-selector" textValue="Choose Theme">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-default-700">Choose Theme</span>
                        <ThemeSelector />
                      </div>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </Tooltip>
            </div>

            {/* Mobile options button */}
            <div className="block sm:hidden">
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button isIconOnly variant="flat" size="sm" className={headerButtonClass}>
                    <EllipsisHorizontalIcon className={iconClass} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="More options" className="min-w-[200px]">
                  <DropdownItem key="theme" className="py-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-default-700">Theme</span>
                      <ThemeSelector />
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    key="settings"
                    startContent={<Cog6ToothIcon className="h-4 w-4" />}
                    onPress={handleOpenSettings}
                    className="py-2"
                  >
                    Settings
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        </header>
      );
    }

    return (
      <header ref={ref} className="absolute right-4 top-2 z-10 flex items-center gap-3">
        {/* Shared indicator */}
        {isSharedView && (
          <Chip
            size="sm"
            variant="flat"
            color="primary"
            className="h-7 text-xs font-medium"
            startContent={
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
            }
          >
            <span className="hidden sm:inline">Shared</span>
            <span className="sm:hidden">Share</span>
          </Chip>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Desktop: Show all buttons */}
          <div className="hidden items-center gap-2 sm:flex">
            {showNavigatorButton && (
              <Tooltip content="Chat Navigator" placement="bottom" delay={100} closeDelay={0}>
                <Button
                  isIconOnly
                  variant="flat"
                  size="sm"
                  className={headerButtonClass}
                  onPress={onToggleNavigator}
                  data-testid="chat-navigator-toggle"
                >
                  <FileText className={iconClass} />
                </Button>
              </Tooltip>
            )}
            {!isSharedView && (
              <Tooltip content="Share Chat" placement="bottom" delay={100} closeDelay={0}>
                <ShareButton session={sessionData} />
              </Tooltip>
            )}
            <Tooltip content="Change Theme" placement="bottom" delay={100} closeDelay={0}>
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button isIconOnly variant="flat" size="sm" className={headerButtonClass}>
                    <Palette className={iconClass} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Theme options" className="min-w-[200px]">
                  <DropdownItem key="theme-selector" textValue="Choose Theme">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-default-700">Choose Theme</span>
                      <ThemeSelector />
                    </div>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </Tooltip>
            <Tooltip content="Settings" placement="bottom" delay={100} closeDelay={0}>
              <Button
                isIconOnly
                variant="flat"
                size="sm"
                className={headerButtonClass}
                onPress={handleOpenSettings}
              >
                <Cog6ToothIcon className={iconClass} />
              </Button>
            </Tooltip>
          </div>

          {/* Mobile: Individual buttons */}
          <div className="flex items-center gap-2 sm:hidden">
            {/* Navigator button */}
            {showNavigatorButton && (
              <Tooltip content="Chat Navigator" placement="bottom" delay={100} closeDelay={0}>
                <Button
                  isIconOnly
                  variant="flat"
                  size="sm"
                  className={headerButtonClass}
                  onPress={onToggleNavigator}
                  data-testid="chat-navigator-toggle"
                >
                  <FileText className={iconClass} />
                </Button>
              </Tooltip>
            )}

            {/* Individual share button for mobile */}
            {!isSharedView && (
              <Tooltip content="Share Chat" placement="bottom" delay={100} closeDelay={0}>
                <ShareButton session={sessionData} />
              </Tooltip>
            )}

            {/* More options dropdown */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button isIconOnly variant="flat" size="sm" className={headerButtonClass}>
                  <EllipsisHorizontalIcon className={iconClass} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="More options" className="min-w-[200px]">
                <DropdownItem key="theme" className="py-2">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-default-700">Theme</span>
                    <ThemeSelector />
                  </div>
                </DropdownItem>
                <DropdownItem
                  key="settings"
                  startContent={<Cog6ToothIcon className="h-4 w-4" />}
                  onPress={handleOpenSettings}
                  className="py-2"
                >
                  Settings
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </header>
    );
  }
);

ChatHeader.displayName = "ChatHeader";
