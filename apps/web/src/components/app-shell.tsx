"use client";

import { SHORTCUTS } from "@/config/shortcuts";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useWindow } from "@/hooks/use-window";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/stores/ui-store";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button, useDisclosure } from "@heroui/react";
import { PanelRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OnboardingModal } from "./onboarding";
import { SearchModal } from "./search/search-modal";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start closed on mobile
  const router = useRouter();
  const pathname = usePathname();
  const windowObj = useWindow();
  const { user } = useAuth();
  const { focusSearch } = useUiStore();
  const {
    isOpen: isSearchModalOpen,
    onOpen: onSearchModalOpen,
    onClose: onSearchModalClose,
  } = useDisclosure();
  const {
    isOpen: isOnboardingOpen,
    onOpen: onOnboardingOpen,
    onClose: onOnboardingClose,
  } = useDisclosure();
  const { hasCompletedOnboarding, isLoading, markOnboardingAsCompleted } = useOnboarding();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when an input, textarea, or select is focused, or in contentEditable
      const target = event.target as HTMLElement;
      if (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
      const isModifier = isMac ? event.metaKey : event.ctrlKey;

      const pressedShortcut = SHORTCUTS.find(
        (s) =>
          s.mod === isModifier && s.shift === event.shiftKey && s.key === event.key.toLowerCase()
      );

      if (pressedShortcut) {
        event.preventDefault();
        switch (pressedShortcut.id) {
          case "search":
            onSearchModalOpen();
            break;
          case "new-chat":
            router.push("/");
            break;
          case "toggle-sidebar":
            setIsSidebarOpen((prev) => !prev);
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [router, focusSearch, isSidebarOpen, onSearchModalOpen]);

  useEffect(() => {
    if (user && !isLoading && !hasCompletedOnboarding) {
      onOnboardingOpen();
    }
  }, [user, isLoading, hasCompletedOnboarding, onOnboardingOpen]);

  // Initialize sidebar state based on screen size
  useEffect(() => {
    if (windowObj) {
      setIsSidebarOpen(windowObj.innerWidth >= 1024);
    }
  }, [windowObj]);

  // Close sidebar on mobile when pathname changes (any navigation)
  useEffect(() => {
    if (windowObj && windowObj.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [pathname, windowObj]);

  // Handle window resize
  useEffect(() => {
    if (!windowObj) return;

    const handleResize = () => {
      if (windowObj.innerWidth >= 1024) {
        setIsSidebarOpen(true); // Auto-open on desktop
      } else {
        setIsSidebarOpen(false); // Auto-close on mobile
      }
    };

    windowObj.addEventListener("resize", handleResize);
    return () => windowObj.removeEventListener("resize", handleResize);
  }, [windowObj]);

  const handleSelectChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
    // Sidebar will auto-close via pathname useEffect on mobile
  };

  const handleOpenSettings = () => {
    router.push("/settings");
    // Sidebar will auto-close via pathname useEffect on mobile
  };

  const currentChatId = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "chat" && segments[1]) {
      return segments[1];
    }
    return "";
  }, [pathname]);

  const handleCloseOnboarding = () => {
    markOnboardingAsCompleted();
    onOnboardingClose();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="fixed left-4 top-4 z-[60]">
        {isSidebarOpen ? (
          <Button
            variant="flat"
            size="sm"
            isIconOnly
            onPress={() => setIsSidebarOpen(false)}
            className="h-10 w-10 transition-all duration-200 hover:scale-110 hover:bg-content3 hover:shadow-md active:scale-95"
            aria-label="Close menu"
          >
            <PanelRight className="h-5 w-5 transition-transform duration-200" />
          </Button>
        ) : (
          <div className="flex flex-row rounded-md bg-content2 p-1 shadow-sm backdrop-blur-sm">
            <Button
              variant="light"
              size="sm"
              isIconOnly
              onPress={() => setIsSidebarOpen(true)}
              className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-content3 hover:shadow-sm active:scale-95"
              aria-label="Open menu"
            >
              <PanelRight className="h-5 w-5 transition-transform duration-200 hover:rotate-12" />
            </Button>
            <Button
              variant="light"
              size="sm"
              isIconOnly
              onPress={() => {
                onSearchModalOpen();
              }}
              className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-primary/10 hover:text-primary hover:shadow-sm active:scale-95"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5 transition-all duration-200 hover:rotate-12" />
            </Button>
            <Button
              variant="light"
              size="sm"
              isIconOnly
              onPress={() => router.push("/")}
              className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-success/10 hover:text-success hover:shadow-sm active:scale-95"
              aria-label="New Chat"
            >
              <PlusIcon className="h-5 w-5 transition-all duration-200 hover:rotate-90" />
            </Button>
          </div>
        )}
      </div>
      <Sidebar
        selectedChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onOpenSettings={handleOpenSettings}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main
        className={`flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out ${
          isSidebarOpen ? "lg:ml-64" : "lg:ml-0"
        }`}
      >
        <div className="h-full lg:pl-4 lg:pt-4">{children}</div>
      </main>
      <OnboardingModal isOpen={isOnboardingOpen} onClose={handleCloseOnboarding} />
      <SearchModal isOpen={isSearchModalOpen} onClose={onSearchModalClose} />
    </div>
  );
}
