"use client";

import { useWindow } from "@/hooks/use-window";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  EllipsisHorizontalIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
  useDisclosure,
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
  onNewChat: () => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onClose: () => void;
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

export const Sidebar = ({
  selectedChatId,
  onSelectChat,
  onNewChat,
  onOpenSettings,
  isOpen,
  onClose,
}: SidebarProps) => {
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, signOut } = useAuth();
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const windowObj = useWindow();

  // Prevent hydration mismatch by only rendering theme switcher after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNewChat = () => {
    // Use the passed onNewChat prop to navigate to home
    onNewChat();
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

  const handleSignOut = () => {
    onModalClose();
    signOut();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && windowObj && windowObj.innerWidth < 1024 && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-divider bg-content1 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="border-b border-divider p-3">
          <div className="mb-3 flex h-10 items-center">
            <h2 className="ml-14 text-lg font-bold text-foreground">AlmostT3</h2>
          </div>

          <Button
            onPress={handleNewChat}
            color="primary"
            size="sm"
            className="h-8 w-full"
            startContent={<PlusIcon className="h-4 w-4" />}
          >
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="border-b border-divider p-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search your threads..."
              className="w-full rounded-lg border border-divider bg-content2 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Chat List */}
        <ScrollShadow className="flex-1 p-2">
          <div className="space-y-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group relative cursor-pointer rounded-lg p-3 transition-all duration-200 ${
                  selectedChatId === chat.id
                    ? "border border-primary/20 bg-primary/10"
                    : "hover:bg-content2"
                }`}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="rounded-md bg-content2 p-1">
                        <ChatBubbleLeftRightIcon className="h-3 w-3 text-default-600" />
                      </div>
                      <h3 className="truncate text-sm font-medium text-foreground">{chat.title}</h3>
                    </div>
                    <p className="mb-1 truncate text-xs leading-relaxed text-default-500">
                      {chat.lastMessage}
                    </p>
                    <p className="text-xs text-default-400">{chat.timestamp}</p>
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
              </div>
            ))}
          </div>
        </ScrollShadow>

        {/* Bottom Actions */}
        <div className="space-y-1 border-t border-divider p-2">
          {/* User Info & Logout */}
          {user && (
            <div className="space-y-1">
              <>
                {/* User Info */}
                <div className="rounded-lg bg-content2 p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                      <UserIcon className="h-3 w-3 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {user.user_metadata?.full_name || "User"}
                      </p>
                      <p className="truncate text-xs text-default-500">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <Button
                  variant="light"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 text-danger"
                  onPress={onModalOpen}
                  startContent={<ArrowRightOnRectangleIcon className="h-4 w-4" />}
                >
                  <span className="text-sm font-medium">Sign Out</span>
                </Button>
              </>
            </div>
          )}

          {/* Theme Switcher */}
          <div className="flex items-center justify-between">
            {mounted ? (
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
            ) : (
              // Render placeholder while mounting to prevent layout shift
              <Button
                variant="light"
                size="sm"
                className="h-8 w-full justify-start gap-2"
                isDisabled
              >
                <span className="text-sm font-medium">Theme</span>
              </Button>
            )}
          </div>

          {/* Settings Button */}
          <Button
            variant="light"
            size="sm"
            className="h-8 w-full justify-start gap-2"
            onPress={onOpenSettings}
            startContent={<Cog6ToothIcon className="h-4 w-4" />}
          >
            <span className="text-sm font-medium">Settings</span>
          </Button>
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="sm">
        <ModalContent>
          <ModalHeader>Sign Out</ModalHeader>
          <ModalBody>
            <p className="text-default-600">Are you sure you want to sign out?</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onModalClose}>
              Cancel
            </Button>
            <Button color="danger" onPress={handleSignOut}>
              Sign Out
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
