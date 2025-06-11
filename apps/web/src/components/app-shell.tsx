"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [selectedChatId, setSelectedChatId] = useState<string>("main");
  const router = useRouter();
  const pathname = usePathname();

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    if (chatId === "main") {
      router.push("/");
    } else {
      router.push(`/chat/${chatId}`);
    }
  };

  const handleNewChat = () => {
    router.push("/");
  };

  const handleOpenSettings = () => {
    router.push("/settings");
  };

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
      />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
