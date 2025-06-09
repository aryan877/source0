"use client";

import { ChatWindow } from "@/components";
import { use } from "react";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { id } = use(params);

  return <ChatWindow chatId={id} />;
}
