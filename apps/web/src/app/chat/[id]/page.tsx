"use client";

import { ChatWindow } from "@/components";
import { use } from "react";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  // Use React.use() to unwrap the Promise in client components
  const { id } = use(params);

  return <ChatWindow chatId={id} />;
}
