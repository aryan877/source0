import { ChatWindow } from "@/components";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  return <ChatWindow key={id} chatId={id} />;
}
