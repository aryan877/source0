"use client";

import dynamic from "next/dynamic";

const ChatWindow = dynamic(() => import("@/components/chat/chat-window"), {
  ssr: false,
});

export default function HomePage() {
  return <ChatWindow chatId="new" />;
}
