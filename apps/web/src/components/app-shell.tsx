"use client";

import { SHORTCUTS } from "@/config/shortcuts";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useWindow } from "@/hooks/use-window";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/stores/ui-store";
import { Button, useDisclosure } from "@heroui/react";
import { PanelRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OnboardingModal } from "./onboarding";
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
            if (!isSidebarOpen) {
              setIsSidebarOpen(true);
            }
            focusSearch();
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
  }, [router, focusSearch, isSidebarOpen]);

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
      <Button
        variant="flat"
        size="sm"
        isIconOnly
        onPress={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed left-4 top-4 z-[60] h-10 w-10"
        aria-label="Toggle menu"
      >
        <PanelRight className="h-5 w-5" />
      </Button>
      <Sidebar
        selectedChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onOpenSettings={handleOpenSettings}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main
        className={`flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out ${
          isSidebarOpen ? "lg:ml-72" : "lg:ml-0"
        }`}
      >
        {children}
      </main>
      <OnboardingModal isOpen={isOnboardingOpen} onClose={handleCloseOnboarding} />
    </div>
  );
}
