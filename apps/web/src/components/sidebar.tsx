"use client";

import { SHORTCUTS } from "@/config/shortcuts";
import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { useWindow } from "@/hooks/use-window";
import { useAuth } from "@/hooks/useAuth";
import { ChatSession } from "@/services";
import { useApiKeysStore } from "@/stores/api-keys-store";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useUiStore } from "@/stores/ui-store";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { categorizeSessions, type CategorizedSessions } from "@/utils/session-categorizer";
import {
  ArrowRightEndOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  EllipsisHorizontalIcon,
  PlusIcon,
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
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { GitBranchIcon, ImageIcon, Pin, PinOff } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

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
  isSelected: boolean;
  isBranched: boolean;
  isPinned: boolean;
  onSelect: (chatId: string) => void;
  onDelete: (chatId: string) => void;
  onTogglePin: (chatId: string, isPinned: boolean) => void;
  isUpdating: boolean;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const queryClient = useQueryClient();

  // Store reset functions
  const resetApiKeysStore = useApiKeysStore((state) => state.resetStore);
  const resetModelSelectorStore = useModelSelectorStore((state) => state.resetStore);
  const resetUiStore = useUiStore((state) => state.resetStore);
  const resetUserPreferencesStore = useUserPreferencesStore((state) => state.resetStore);

  // Prevent hydration mismatch by only rendering theme switcher after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = useCallback(
    (newTheme: string) => {
      setTheme(newTheme);
    },
    [setTheme]
  );

  const handleSignOut = useCallback(() => {
    // Clear all stores before signing out
    resetApiKeysStore();
    resetModelSelectorStore();
    resetUiStore();
    resetUserPreferencesStore();

    // Clear React Query cache - defer to next microtask to avoid race conditions
    // This ensures components finish unmounting before cache is cleared
    Promise.resolve().then(() => {
      queryClient.clear();
    });

    // Then sign out
    signOut();
  }, [
    resetApiKeysStore,
    resetModelSelectorStore,
    resetUiStore,
    resetUserPreferencesStore,
    queryClient,
    signOut,
  ]);

  const handleSignOutConfirm = useCallback(() => {
    onModalClose();
    handleSignOut();
  }, [onModalClose, handleSignOut]);

  const currentTheme = resolvedTheme || theme || "lavender";

  return {
    user,
    signOut: handleSignOut,
    signOutConfirm: handleSignOutConfirm,
    isModalOpen,
    onModalOpen,
    onModalClose,
    windowObj,
    router,
    mounted,
    currentTheme,
    handleThemeChange,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
  };
};

const useSidebarChatHandlers = (
  selectedChatId: string,
  onSelectChat: (chatId: string) => void,
  windowObj: Window | null,
  router: ReturnType<typeof useRouter>,
  chats: ReturnType<typeof useChatSessions>["sessions"],
  deleteSession: ReturnType<typeof useChatSessions>["deleteSession"]
) => {
  const handleNewChat = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleDeleteChat = useCallback(
    (chatId: string) => {
      deleteSession(chatId);
      if (selectedChatId === chatId) {
        if (chats.length <= 1) {
          router.push("/");
        } else {
          const remainingChats = chats.filter((c) => c.id !== chatId);
          onSelectChat(remainingChats[0]?.id || "new");
        }
      }
    },
    [deleteSession, selectedChatId, chats, onSelectChat, router]
  );

  return {
    handleNewChat,
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

const SidebarHeader = memo(
  ({ onNewChat, onOpenGallery }: { onNewChat: () => void; onOpenGallery: () => void }) => (
    <div className="p-4">
      <div className="mb-4 flex h-10 items-center justify-center">
        <h1 className="font-orbitron text-2xl font-black tracking-widest text-foreground">
          SOURCE0
        </h1>
      </div>
      <div className="flex w-full items-center gap-2">
        <Button
          onPress={onNewChat}
          color="primary"
          size="md"
          className="relative h-10 w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 font-semibold text-white shadow-lg shadow-primary/25"
          startContent={
            <div className="relative z-10">
              <PlusIcon className="h-4 w-4" />
            </div>
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
          <span className="relative z-10 tracking-wide">New Chat</span>
        </Button>
        <Tooltip
          content="AI Generated Images Gallery"
          placement="bottom"
          delay={500}
          closeDelay={0}
        >
          <Button
            onPress={onOpenGallery}
            variant="ghost"
            isIconOnly
            aria-label="Image Gallery"
            className="h-10 min-w-10"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
        </Tooltip>
      </div>
    </div>
  )
);

SidebarHeader.displayName = "SidebarHeader";

const SearchBar = memo(
  ({
    searchQuery,
    setSearchQuery,
  }: {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
  }) => {
    const { isSearchFocused, blurSearch } = useUiStore();
    const inputRef = useRef<HTMLInputElement>(null);
    const searchShortcut = SHORTCUTS.find((s) => s.id === "search");

    useEffect(() => {
      if (isSearchFocused) {
        inputRef.current?.focus();
        blurSearch(); // Reset the trigger
      }
    }, [isSearchFocused, blurSearch]);

    return (
      <div className="p-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-4 w-4 text-foreground/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search your threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-divider bg-content2 py-2 pl-10 pr-16 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchShortcut && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <div className="flex items-center gap-1">
                {searchShortcut.display.map((key, index) => (
                  <kbd
                    key={index}
                    className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-foreground/20 bg-content3 px-1 text-xs font-medium text-foreground/70"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

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
    isSelected,
    isBranched,
    isPinned,
    onSelect,
    onDelete,
    onTogglePin,
    isUpdating,
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
            <div className="flex items-center gap-2">
              {isBranched && (
                <div className="rounded-md bg-content2 p-1">
                  <GitBranchIcon className="h-3 w-3 text-warning-600" />
                </div>
              )}
              <h3 className="truncate text-sm font-medium text-foreground">{title}</h3>
              {isBranched && (
                <div className="rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-900/30 dark:text-warning-400">
                  Branch
                </div>
              )}
            </div>
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
                  isDisabled={isUpdating}
                >
                  <EllipsisHorizontalIcon className="h-3 w-3" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                onAction={(key) => {
                  if (key === "delete") {
                    onDelete(chatId);
                  } else if (key === "pin") {
                    onTogglePin(chatId, !isPinned);
                  }
                }}
              >
                <DropdownItem
                  key="pin"
                  startContent={
                    isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />
                  }
                >
                  {isPinned ? "Unpin" : "Pin"}
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

const CategorySection = memo(
  ({
    title,
    sessions,
    selectedChatId,
    onSelectChat,
    onDeleteChat,
    onTogglePin,
    isDeletingSession,
    isTogglingPin,
    isOnNewChat,
  }: {
    title: string;
    sessions: ChatSession[];
    selectedChatId: string;
    onSelectChat: (chatId: string) => void;
    onDeleteChat: (chatId: string) => void;
    onTogglePin: (chatId: string, isPinned: boolean) => void;
    isDeletingSession: boolean;
    isTogglingPin: boolean;
    isOnNewChat: boolean;
  }) => {
    if (sessions.length === 0) return null;

    const getTitleColor = (title: string) => {
      switch (title) {
        case "Pinned":
          return "text-warning-600 dark:text-warning-400";
        case "Today":
          return "text-primary-600 dark:text-primary-400";
        case "Yesterday":
          return "text-secondary-600 dark:text-secondary-400";
        case "Last 7 Days":
          return "text-success-600 dark:text-success-400";
        case "Older":
          return "text-default-600 dark:text-default-500";
        default:
          return "text-foreground-600 dark:text-foreground-500";
      }
    };

    return (
      <div className="mb-4">
        <h4
          className={`${getTitleColor(title)} mb-2 flex items-center gap-1 px-2 text-xs font-bold uppercase tracking-wider`}
        >
          {title === "Pinned" && <Pin className="h-3 w-3" />}
          {title}
        </h4>
        <div className="space-y-1">
          {sessions.map((chat) => (
            <ChatItem
              key={chat.id}
              chatId={chat.id}
              title={chat.title}
              isSelected={!isOnNewChat && selectedChatId === chat.id}
              isBranched={!!chat.branched_from_session_id}
              isPinned={!!chat.is_pinned}
              onSelect={onSelectChat}
              onDelete={onDeleteChat}
              onTogglePin={onTogglePin}
              isUpdating={isDeletingSession || isTogglingPin}
            />
          ))}
        </div>
      </div>
    );
  }
);

CategorySection.displayName = "CategorySection";

const CategorizedChatList = memo(
  ({
    categorizedSessions,
    selectedChatId,
    onSelectChat,
    onDeleteChat,
    onTogglePin,
    isDeletingSession,
    isTogglingPin,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  }: {
    categorizedSessions: CategorizedSessions;
    selectedChatId: string;
    onSelectChat: (chatId: string) => void;
    onDeleteChat: (chatId: string) => void;
    onTogglePin: (chatId: string, isPinned: boolean) => void;
    isDeletingSession: boolean;
    isTogglingPin: boolean;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage?: () => void;
  }) => {
    const isOnNewChat = selectedChatId === "new" || !selectedChatId;

    const hasAnySessions = Object.values(categorizedSessions).some((arr) => arr.length > 0);

    return (
      <ScrollShadow className="flex-1 p-2">
        <div className="space-y-1">
          <CategorySection
            title="Pinned"
            sessions={categorizedSessions.pinned}
            selectedChatId={selectedChatId}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
            onTogglePin={onTogglePin}
            isDeletingSession={isDeletingSession}
            isTogglingPin={isTogglingPin}
            isOnNewChat={isOnNewChat}
          />
          <CategorySection
            title="Today"
            sessions={categorizedSessions.today}
            selectedChatId={selectedChatId}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
            onTogglePin={onTogglePin}
            isDeletingSession={isDeletingSession}
            isTogglingPin={isTogglingPin}
            isOnNewChat={isOnNewChat}
          />
          <CategorySection
            title="Yesterday"
            sessions={categorizedSessions.yesterday}
            selectedChatId={selectedChatId}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
            onTogglePin={onTogglePin}
            isDeletingSession={isDeletingSession}
            isTogglingPin={isTogglingPin}
            isOnNewChat={isOnNewChat}
          />
          <CategorySection
            title="Last 7 Days"
            sessions={categorizedSessions.lastWeek}
            selectedChatId={selectedChatId}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
            onTogglePin={onTogglePin}
            isDeletingSession={isDeletingSession}
            isTogglingPin={isTogglingPin}
            isOnNewChat={isOnNewChat}
          />
          <CategorySection
            title="Older"
            sessions={categorizedSessions.older}
            selectedChatId={selectedChatId}
            onSelectChat={onSelectChat}
            onDeleteChat={onDeleteChat}
            onTogglePin={onTogglePin}
            isDeletingSession={isDeletingSession}
            isTogglingPin={isTogglingPin}
            isOnNewChat={isOnNewChat}
          />
        </div>
        {hasAnySessions && hasNextPage && (
          <div className="mt-4 flex justify-center">
            <Button onPress={fetchNextPage} disabled={isFetchingNextPage} variant="flat" size="sm">
              {isFetchingNextPage ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </ScrollShadow>
    );
  }
);

CategorizedChatList.displayName = "CategorizedChatList";

const UserInfo = memo(({ user }: { user: User }) => {
  const { hidePersonalInfo } = useUserPreferencesStore();
  return (
    <div className="rounded-lg bg-content2 p-2">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
          <UserIcon className="h-3 w-3 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {hidePersonalInfo ? "User" : user.user_metadata?.full_name || "User"}
          </p>
          {!hidePersonalInfo && <p className="truncate text-xs text-default-500">{user.email}</p>}
        </div>
      </div>
    </div>
  );
});

UserInfo.displayName = "UserInfo";

const SidebarBottomActions = memo(
  ({
    user,
    onSignOut,
    onLogin,
    onOpenSettings,
  }: {
    user: User | null;
    onSignOut: () => void;
    onLogin: () => void;
    onOpenSettings: () => void;
  }) => (
    <div className="space-y-1 p-2">
      {user ? (
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
      ) : (
        <Button
          color="primary"
          size="sm"
          className="h-8 w-full justify-start gap-2"
          onPress={onLogin}
          startContent={<ArrowRightEndOnRectangleIcon className="h-4 w-4" />}
        >
          <span className="text-sm font-medium">Login</span>
        </Button>
      )}

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
      signOutConfirm,
      isModalOpen,
      onModalOpen,
      onModalClose,
      windowObj,
      router,
      searchQuery,
      setSearchQuery,
      debouncedSearchQuery,
    } = useSidebarState();

    // Use React Query for chat sessions
    const {
      sessions: chats,
      isLoading: isLoadingChats,
      error: chatsError,
      deleteSession,
      isDeletingSession,
      invalidateSessions,
      hasNextPage,
      fetchNextPage,
      isFetchingNextPage,
      togglePinSession,
      isTogglingPin,
    } = useChatSessions(debouncedSearchQuery);

    const { handleNewChat, handleDeleteChat } = useSidebarChatHandlers(
      selectedChatId,
      onSelectChat,
      windowObj,
      router,
      chats,
      deleteSession
    );

    const handleTogglePin = useCallback(
      (chatId: string, isPinned: boolean) => {
        togglePinSession({ sessionId: chatId, isPinned });
      },
      [togglePinSession]
    );

    const categorizedSessions = categorizeSessions(chats);

    const handleLogin = useCallback(() => {
      router.push("/auth/login");
    }, [router]);

    const handleOpenGallery = useCallback(() => {
      router.push("/gallery");
    }, [router]);

    return (
      <>
        <SidebarOverlay isOpen={isOpen} onClose={onClose} />

        {/* Main Sidebar */}
        <div
          className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-background transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarHeader onNewChat={handleNewChat} onOpenGallery={handleOpenGallery} />
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          {!user ? (
            <div className="flex-1 p-2">
              <div className="rounded-lg bg-content2 p-3 text-center">
                <p className="text-sm text-default-500">Sign in to view your chats</p>
              </div>
            </div>
          ) : isLoadingChats ? (
            <div className="flex-1 p-2">
              <LoadingSkeleton />
            </div>
          ) : chatsError ? (
            <div className="flex-1 p-2">
              <ErrorState onRetry={() => invalidateSessions()} />
            </div>
          ) : chats.length === 0 ? (
            <div className="flex-1 p-2">
              <EmptyState />
            </div>
          ) : (
            <CategorizedChatList
              categorizedSessions={categorizedSessions}
              selectedChatId={selectedChatId}
              onSelectChat={onSelectChat}
              onDeleteChat={handleDeleteChat}
              onTogglePin={handleTogglePin}
              isDeletingSession={isDeletingSession}
              isTogglingPin={isTogglingPin}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          )}
          <SidebarBottomActions
            user={user}
            onSignOut={onModalOpen}
            onLogin={handleLogin}
            onOpenSettings={onOpenSettings}
          />
        </div>

        <SignOutModal isOpen={isModalOpen} onClose={onModalClose} onConfirm={signOutConfirm} />
      </>
    );
  }
);

Sidebar.displayName = "Sidebar";
