"use client";

import { useState } from "react";
import { ChatWindow } from "./chat/ChatWindow";
import { Settings } from "./chat/Settings";
import { Sidebar } from "./chat/Sidebar";

export default function ChatApp() {
  const [currentView, setCurrentView] = useState<"chat" | "settings">("chat");
  const [selectedChatId, setSelectedChatId] = useState<string>("1");

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        onOpenSettings={() => setCurrentView("settings")}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        {currentView === "chat" ? (
          <ChatWindow chatId={selectedChatId} />
        ) : (
          <Settings onBack={() => setCurrentView("chat")} />
        )}
      </main>
    </div>
  );
}
