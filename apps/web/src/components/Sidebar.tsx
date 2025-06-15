"use client";

import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
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
import { User } from "@supabase/supabase-js";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useState } from "react";

// ========================================
// TYPES & INTERFACES
// ========================================

interface SidebarProps {
  selectedChatId: string;
  onSelectChat: (chatId: string) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatItemProps {
  chatId: string;
  title: string;
  updatedAt: string;
  isSelected: boolean;
  onSelect: (chatId: string) => void;
  onFork: (chatId: string) => void;
  onDelete: (chatId: string) => void;
  isDeleting: boolean;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

const formatTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

// ========================================
// CUSTOM HOOKS
// ========================================

const useSidebarState = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, signOut } = useAuth();
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const windowObj = useWindow();
  const router = useRouter();

  // Prevent hydration mismatch by only rendering theme switcher after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const currentTheme = resolvedTheme || theme || "system";

  return {
    user,
    signOut,
    isModalOpen,
    onModalOpen,
    onModalClose,
    windowObj,
    router,
    mounted,
    currentTheme,
    toggleTheme,
  };
};

const useSidebarChatHandlers = (
  selectedChatId: string,
  onSelectChat: (chatId: string) => void,
  onClose: () => void,
  windowObj: Window | null,
  router: ReturnType<typeof useRouter>,
  chats: ReturnType<typeof useChatSessions>["sessions"],
  deleteSession: ReturnType<typeof useChatSessions>["deleteSession"]
) => {
  const handleNewChat = useCallback(() => {
    router.push("/");
    // Only close sidebar on mobile screens
    if (windowObj && windowObj.innerWidth < 1024) {
      onClose();
    }
  }, [router, windowObj, onClose]);

  const handleForkChat = useCallback(
    (chatId: string) => {
      const originalChat = chats.find((c) => c.id === chatId);
      if (originalChat) {
        // For now, just redirect to a new chat - we can implement forking later
        router.push("/");
      }
    },
    [chats, router]
  );

  const handleDeleteChat = useCallback(
    (chatId: string) => {
      deleteSession(chatId);
      if (selectedChatId === chatId && chats.length > 1) {
        const remainingChats = chats.filter((c) => c.id !== chatId);
        onSelectChat(remainingChats[0]?.id || "new");
      }
    },
    [deleteSession, selectedChatId, chats, onSelectChat]
  );

  return {
    handleNewChat,
    handleForkChat,
    handleDeleteChat,
  };
};

// ========================================
// SUB-COMPONENTS
// ========================================

const SidebarOverlay = memo(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { windowObj } = useSidebarState();

  if (!isOpen || !windowObj || windowObj.innerWidth >= 1024) return null;

  return <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />;
});

SidebarOverlay.displayName = "SidebarOverlay";

const SidebarHeader = memo(({ onNewChat }: { onNewChat: () => void }) => (
  <div className="border-b border-divider p-3">
    <div className="mb-3 flex h-10 items-center">
      <h2 className="ml-14 text-lg font-bold text-foreground">AlmostT3</h2>
    </div>

    <Button
      onPress={onNewChat}
      color="primary"
      size="sm"
      className="h-8 w-full"
      startContent={<PlusIcon className="h-4 w-4" />}
    >
      New Chat
    </Button>
  </div>
));

SidebarHeader.displayName = "SidebarHeader";

const SearchBar = memo(() => (
  <div className="border-b border-divider p-3">
    <div className="relative">
      <input
        type="text"
        placeholder="Search your threads..."
        className="w-full rounded-lg border border-divider bg-content2 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  </div>
));

SearchBar.displayName = "SearchBar";

const LoadingSkeleton = memo(() => (
  <div className="space-y-2">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="animate-pulse rounded-lg bg-content2 p-3">
        <div className="mb-2 h-4 w-3/4 rounded bg-content3"></div>
        <div className="h-3 w-1/2 rounded bg-content3"></div>
      </div>
    ))}
  </div>
));

LoadingSkeleton.displayName = "LoadingSkeleton";

const EmptyState = memo(() => (
  <div className="rounded-lg bg-content2 p-3 text-center">
    <p className="text-sm text-default-500">No chats yet</p>
    <p className="text-xs text-default-400">Start a new conversation</p>
  </div>
));

EmptyState.displayName = "EmptyState";

const ErrorState = memo(({ onRetry }: { onRetry: () => void }) => (
  <div className="rounded-lg bg-danger/10 p-3 text-center">
    <p className="text-sm text-danger">Failed to load chats</p>
    <Button size="sm" variant="flat" onPress={onRetry} className="mt-2">
      Retry
    </Button>
  </div>
));

ErrorState.displayName = "ErrorState";

const ChatItem = memo(
  ({
    chatId,
    title,
    updatedAt,
    isSelected,
    onSelect,
    onFork,
    onDelete,
    isDeleting,
  }: ChatItemProps) => {
    return (
      <div
        className={`group relative cursor-pointer rounded-lg p-3 transition-all duration-200 ${
          isSelected ? "border border-primary/20 bg-primary/10" : "hover:bg-content2"
        }`}
        onClick={() => onSelect(chatId)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-md bg-content2 p-1">
                <ChatBubbleLeftRightIcon className="h-3 w-3 text-default-600" />
              </div>
              <h3 className="truncate text-sm font-medium text-foreground">{title}</h3>
            </div>
            <p className="text-xs text-default-400">{formatTimestamp(updatedAt)}</p>
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
                  isDisabled={isDeleting}
                >
                  <EllipsisHorizontalIcon className="h-3 w-3" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                onAction={(key) => {
                  if (key === "fork") {
                    onFork(chatId);
                  } else if (key === "delete") {
                    onDelete(chatId);
                  }
                }}
              >
                <DropdownItem key="fork" startContent={<CodeBracketIcon className="h-4 w-4" />}>
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
    );
  }
);

ChatItem.displayName = "ChatItem";

const ChatList = memo(
  ({
    chats,
    selectedChatId,
    onSelectChat,
    onForkChat,
    onDeleteChat,
    isLoading,
    error,
    onRetry,
    isDeletingSession,
  }: {
    chats: ReturnType<typeof useChatSessions>["sessions"];
    selectedChatId: string;
    onSelectChat: (chatId: string) => void;
    onForkChat: (chatId: string) => void;
    onDeleteChat: (chatId: string) => void;
    isLoading: boolean;
    error: Error | null;
    onRetry: () => void;
    isDeletingSession: boolean;
  }) => {
    // Don't highlight any chat if we're on a new chat
    const isOnNewChat = selectedChatId === "new" || !selectedChatId;

    return (
      <ScrollShadow className="flex-1 p-2">
        <div className="space-y-1">
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <ErrorState onRetry={onRetry} />
          ) : chats.length === 0 ? (
            <EmptyState />
          ) : (
            chats.map((chat) => (
              <ChatItem
                key={chat.id}
                chatId={chat.id}
                title={chat.title}
                updatedAt={chat.updated_at || new Date().toISOString()}
                isSelected={!isOnNewChat && selectedChatId === chat.id}
                onSelect={onSelectChat}
                onFork={onForkChat}
                onDelete={onDeleteChat}
                isDeleting={isDeletingSession}
              />
            ))
          )}
        </div>
      </ScrollShadow>
    );
  }
);

ChatList.displayName = "ChatList";

const UserInfo = memo(({ user }: { user: User }) => (
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
));

UserInfo.displayName = "UserInfo";

const ThemeToggle = memo(
  ({
    mounted,
    currentTheme,
    onToggle,
  }: {
    mounted: boolean;
    currentTheme: string;
    onToggle: () => void;
  }) => {
    if (!mounted) {
      return (
        <Button variant="light" size="sm" className="h-8 w-full justify-start gap-2" isDisabled>
          <span className="text-sm font-medium">Theme</span>
        </Button>
      );
    }

    return (
      <Button
        variant="light"
        size="sm"
        className="h-8 w-full justify-start gap-2"
        onPress={onToggle}
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
    );
  }
);

ThemeToggle.displayName = "ThemeToggle";

const SidebarBottomActions = memo(
  ({
    user,
    onSignOut,
    mounted,
    currentTheme,
    onToggleTheme,
    onOpenSettings,
  }: {
    user: User | null;
    onSignOut: () => void;
    mounted: boolean;
    currentTheme: string;
    onToggleTheme: () => void;
    onOpenSettings: () => void;
  }) => (
    <div className="space-y-1 border-t border-divider p-2">
      {user && (
        <div className="space-y-1">
          <UserInfo user={user} />
          <Button
            variant="light"
            size="sm"
            className="h-8 w-full justify-start gap-2 text-danger"
            onPress={onSignOut}
            startContent={<ArrowRightOnRectangleIcon className="h-4 w-4" />}
          >
            <span className="text-sm font-medium">Sign Out</span>
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <ThemeToggle mounted={mounted} currentTheme={currentTheme} onToggle={onToggleTheme} />
      </div>

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
  )
);

SidebarBottomActions.displayName = "SidebarBottomActions";

const SignOutModal = memo(
  ({
    isOpen,
    onClose,
    onConfirm,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
  }) => (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        <ModalHeader>Sign Out</ModalHeader>
        <ModalBody>
          <p className="text-default-600">Are you sure you want to sign out?</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="danger" onPress={onConfirm}>
            Sign Out
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
);

SignOutModal.displayName = "SignOutModal";

// ========================================
// MAIN COMPONENT
// ========================================

export const Sidebar = memo(
  ({ selectedChatId, onSelectChat, onOpenSettings, isOpen, onClose }: SidebarProps) => {
    const {
      user,
      signOut,
      isModalOpen,
      onModalOpen,
      onModalClose,
      windowObj,
      router,
      mounted,
      currentTheme,
      toggleTheme,
    } = useSidebarState();

    // Use React Query for chat sessions
    const {
      sessions: chats,
      isLoading: isLoadingChats,
      error: chatsError,
      deleteSession,
      isDeletingSession,
      invalidateSessions,
    } = useChatSessions();

    const { handleNewChat, handleForkChat, handleDeleteChat } = useSidebarChatHandlers(
      selectedChatId,
      onSelectChat,
      onClose,
      windowObj,
      router,
      chats,
      deleteSession
    );

    const handleSignOut = useCallback(() => {
      onModalClose();
      signOut();
    }, [onModalClose, signOut]);

    return (
      <>
        <SidebarOverlay isOpen={isOpen} onClose={onClose} />

        {/* Main Sidebar */}
        <div
          className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-divider bg-content1 transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarHeader onNewChat={handleNewChat} />
          <SearchBar />
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={onSelectChat}
            onForkChat={handleForkChat}
            onDeleteChat={handleDeleteChat}
            isLoading={isLoadingChats}
            error={chatsError}
            onRetry={invalidateSessions}
            isDeletingSession={isDeletingSession}
          />
          <SidebarBottomActions
            user={user}
            onSignOut={onModalOpen}
            mounted={mounted}
            currentTheme={currentTheme}
            onToggleTheme={toggleTheme}
            onOpenSettings={onOpenSettings}
          />
        </div>

        <SignOutModal isOpen={isModalOpen} onClose={onModalClose} onConfirm={handleSignOut} />
      </>
    );
  }
);

Sidebar.displayName = "Sidebar";
