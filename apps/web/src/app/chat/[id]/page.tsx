import { ChatWindow } from "@/components";

interface ChatPageProps {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default function ChatPage({ params }: ChatPageProps) {
  const { id } = params;

  return <ChatWindow key={id} chatId={id} />;
}
