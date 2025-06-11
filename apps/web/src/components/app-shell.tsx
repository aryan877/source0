"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [selectedChatId, setSelectedChatId] = useState<string>("main");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    // Close mobile sidebar when selecting a chat
    setIsMobileSidebarOpen(false);

    if (chatId === "main") {
      router.push("/");
    } else {
      router.push(`/chat/${chatId}`);
    }
  };

  const handleNewChat = () => {
    // Close mobile sidebar when creating new chat
    setIsMobileSidebarOpen(false);
    router.push("/");
  };

  const handleOpenSettings = () => {
    // Close mobile sidebar when opening settings
    setIsMobileSidebarOpen(false);
    router.push("/settings");
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Close mobile sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // lg breakpoint
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Determine current chat ID based on pathname
  const currentChatId = (() => {
    if (pathname === "/") {
      return "main";
    } else if (pathname.startsWith("/chat/")) {
      return pathname.split("/")[2] || "main";
    }
    return selectedChatId;
  })();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        selectedChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onOpenSettings={handleOpenSettings}
        isMobileOpen={isMobileSidebarOpen}
        onMobileToggle={setIsMobileSidebarOpen}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
