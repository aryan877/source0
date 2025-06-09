"use client";

import {
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  EllipsisHorizontalIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  ScrollShadow,
} from "@heroui/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

interface SidebarProps {
  selectedChatId: string;
  onSelectChat: (chatId: string) => void;
  onOpenSettings: () => void;
}

const mockChats: Chat[] = [
  {
    id: "1",
    title: "UI Design Discussion",
    lastMessage: "Let's create a modern chat interface...",
    timestamp: "2m ago",
  },
  {
    id: "2",
    title: "React Best Practices",
    lastMessage: "What are the latest React patterns?",
    timestamp: "1h ago",
  },
  {
    id: "3",
    title: "TypeScript Help",
    lastMessage: "How to type complex objects?",
    timestamp: "3h ago",
  },
];

export const Sidebar = ({ selectedChatId, onSelectChat, onOpenSettings }: SidebarProps) => {
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering theme switcher after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      lastMessage: "",
      timestamp: "now",
    };
    setChats([newChat, ...chats]);
    onSelectChat(newChat.id);
  };

  const handleForkChat = (chatId: string) => {
    const originalChat = chats.find((c) => c.id === chatId);
    if (originalChat) {
      const forkedChat: Chat = {
        id: Date.now().toString(),
        title: `${originalChat.title} (Fork)`,
        lastMessage: originalChat.lastMessage,
        timestamp: "now",
      };
      setChats([forkedChat, ...chats]);
      onSelectChat(forkedChat.id);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    setChats(chats.filter((c) => c.id !== chatId));
    if (selectedChatId === chatId && chats.length > 1) {
      const remainingChats = chats.filter((c) => c.id !== chatId);
      onSelectChat(remainingChats[0]?.id || "");
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Use resolvedTheme for more reliable theme detection
  const currentTheme = resolvedTheme || theme;

  return (
    <>
      {/* Mobile Overlay */}
      {isCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsCollapsed(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`bg-content1 border-divider flex h-full flex-col border-r transition-all duration-300 ease-in-out ${isCollapsed ? "w-16" : "w-72"} lg:relative lg:translate-x-0 ${isCollapsed ? "fixed z-50 lg:relative" : "fixed z-50 lg:relative"} `}
      >
        {/* Header */}
        <div className="border-divider border-b p-3">
          <div className="mb-3 flex items-center justify-between">
            {!isCollapsed && <h2 className="text-foreground text-lg font-bold">DefinitelyNotT3</h2>}
            <Button
              variant="light"
              size="sm"
              isIconOnly
              onPress={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8"
            >
              {isCollapsed ? <Bars3Icon className="h-4 w-4" /> : <XMarkIcon className="h-4 w-4" />}
            </Button>
          </div>

          {!isCollapsed && (
            <Button
              onPress={handleNewChat}
              color="primary"
              size="sm"
              className="h-8 w-full"
              startContent={<PlusIcon className="h-4 w-4" />}
            >
              New Chat
            </Button>
          )}

          {isCollapsed && (
            <Button
              onPress={handleNewChat}
              color="primary"
              size="sm"
              isIconOnly
              className="h-8 w-full"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="border-divider border-b p-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search your threads..."
                className="bg-content2 border-divider focus:ring-primary/50 focus:border-primary w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
            </div>
          </div>
        )}

        {/* Chat List */}
        <ScrollShadow className="flex-1 p-2">
          <div className="space-y-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group relative cursor-pointer rounded-lg transition-all duration-200 ${
                  selectedChatId === chat.id
                    ? "bg-primary/10 border-primary/20 border"
                    : "hover:bg-content2"
                } ${isCollapsed ? "p-2" : "p-3"} `}
                onClick={() => onSelectChat(chat.id)}
              >
                {isCollapsed ? (
                  // Collapsed view - only icon
                  <div className="flex items-center justify-center">
                    <div className="bg-content2 rounded-md p-1.5">
                      <ChatBubbleLeftRightIcon className="text-default-600 h-4 w-4" />
                    </div>
                  </div>
                ) : (
                  // Full view
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <div className="bg-content2 rounded-md p-1">
                          <ChatBubbleLeftRightIcon className="text-default-600 h-3 w-3" />
                        </div>
                        <h3 className="text-foreground truncate text-sm font-medium">
                          {chat.title}
                        </h3>
                      </div>
                      <p className="text-default-500 mb-1 truncate text-xs leading-relaxed">
                        {chat.lastMessage}
                      </p>
                      <p className="text-default-400 text-xs">{chat.timestamp}</p>
                    </div>

                    <div className="opacity-0 transition-opacity group-hover:opacity-100">
                      <Dropdown>
                        <DropdownTrigger>
                          <Button
                            variant="light"
                            size="sm"
                            isIconOnly
                            className="min-w-unit-6 h-6 w-6"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <EllipsisHorizontalIcon className="h-3 w-3" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                          onAction={(key) => {
                            if (key === "fork") {
                              handleForkChat(chat.id);
                            } else if (key === "delete") {
                              handleDeleteChat(chat.id);
                            }
                          }}
                        >
                          <DropdownItem
                            key="fork"
                            startContent={<CodeBracketIcon className="h-4 w-4" />}
                          >
                            Fork Chat
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            startContent={<XMarkIcon className="h-4 w-4" />}
                          >
                            Delete
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollShadow>

        {/* Bottom Actions */}
        <div className="border-divider space-y-1 border-t p-2">
          {/* Theme Switcher */}
          <div className="flex items-center justify-between">
            {mounted ? (
              isCollapsed ? (
                <Button
                  variant="light"
                  size="sm"
                  isIconOnly
                  onPress={toggleTheme}
                  className="h-8 w-full"
                  aria-label={`Switch to ${currentTheme === "light" ? "dark" : "light"} theme`}
                >
                  {currentTheme === "light" ? (
                    <MoonIcon className="h-4 w-4" />
                  ) : (
                    <SunIcon className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <Button
                  variant="light"
                  size="sm"
                  className="h-8 w-full justify-start gap-2"
                  onPress={toggleTheme}
                  startContent={
                    currentTheme === "light" ? (
                      <MoonIcon className="h-4 w-4" />
                    ) : (
                      <SunIcon className="h-4 w-4" />
                    )
                  }
                >
                  <span className="text-sm font-medium">
                    {currentTheme === "light" ? "Dark Mode" : "Light Mode"}
                  </span>
                </Button>
              )
            ) : (
              // Render placeholder while mounting to prevent layout shift
              <Button
                variant="light"
                size="sm"
                className={`h-8 w-full ${isCollapsed ? "" : "justify-start gap-2"}`}
                isDisabled
              >
                {!isCollapsed && <span className="text-sm font-medium">Theme</span>}
              </Button>
            )}
          </div>

          {/* Settings Button */}
          {isCollapsed ? (
            <Button
              variant="light"
              size="sm"
              isIconOnly
              onPress={onOpenSettings}
              className="h-8 w-full"
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="light"
              size="sm"
              className="h-8 w-full justify-start gap-2"
              onPress={onOpenSettings}
              startContent={<Cog6ToothIcon className="h-4 w-4" />}
            >
              <span className="text-sm font-medium">Settings</span>
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
