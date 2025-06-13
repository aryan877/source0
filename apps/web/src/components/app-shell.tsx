"use client";

import { useWindow } from "@/hooks/use-window";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [selectedChatId, setSelectedChatId] = useState<string>("main");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const windowObj = useWindow();

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    if (windowObj && windowObj.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }

    if (chatId === "main") {
      router.push("/");
    } else {
      router.push(`/chat/${chatId}`);
    }
  };

  const handleNewChat = () => {
    if (windowObj && windowObj.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    router.push("/");
  };

  const handleOpenSettings = () => {
    if (windowObj && windowObj.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    router.push("/settings");
  };

  useEffect(() => {
    if (windowObj && windowObj.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [pathname, windowObj]);

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
      <Button
        variant="flat"
        size="sm"
        isIconOnly
        onPress={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed left-4 top-4 z-[60] h-10 w-10"
        aria-label="Toggle menu"
      >
        <Bars3Icon className="h-5 w-5" />
      </Button>
      <Sidebar
        selectedChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
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
