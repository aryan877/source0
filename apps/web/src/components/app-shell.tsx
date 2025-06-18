"use client";

import { useWindow } from "@/hooks/use-window";
import { Button } from "@heroui/react";
import { PanelRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start closed on mobile
  const router = useRouter();
  const pathname = usePathname();
  const windowObj = useWindow();

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
    </div>
  );
}
