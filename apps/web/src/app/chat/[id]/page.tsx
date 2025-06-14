import { ChatWindow } from "@/components";
import { convertToAiMessages, getMessages } from "@/utils/supabase/db";
import { createClient } from "@/utils/supabase/server";
import { type Message } from "ai";
import { redirect } from "next/navigation";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  // Redirect to base chat route if someone tries to access /chat/new directly
  if (id === "new") {
    redirect("/chat");
  }

  const supabase = await createClient();
  const dbMessages = await getMessages(supabase, id);
  const initialMessages: Message[] = convertToAiMessages(dbMessages);

  return <ChatWindow chatId={id} initialMessages={initialMessages} />;
}
