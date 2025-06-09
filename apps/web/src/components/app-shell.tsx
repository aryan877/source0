"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [selectedChatId, setSelectedChatId] = useState<string>("1");
  const router = useRouter();
  const pathname = usePathname();

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    router.push(`/chat/${chatId}`);
  };

  const handleOpenSettings = () => {
    router.push("/settings");
  };

  // Extract chat ID from current path if we're on a chat route
  const currentChatId = pathname.startsWith("/chat/")
    ? pathname.split("/")[2] || selectedChatId
    : selectedChatId;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        selectedChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onOpenSettings={handleOpenSettings}
      />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
