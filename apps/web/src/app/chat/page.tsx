import { ChatWindow } from "@/components";

export const dynamic = "force-dynamic";

export default function NewChatPage() {
  // Use "new" as the chatId for new chats - the ChatWindow will handle creating a new session
  return <ChatWindow chatId="new" initialMessages={[]} />;
}
