import { ChatWindow } from "@/components";
import { getSessionByShareSlug } from "@/services/chat-sessions.server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface SharedChatPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: SharedChatPageProps): Promise<Metadata> {
  const { slug } = await params;
  const session = await getSessionByShareSlug(slug);

  if (!session || !session.is_public) {
    return {
      title: "Shared Chat Not Found",
      description: "The shared chat you're looking for doesn't exist or is no longer public.",
    };
  }

  return {
    title: `${session.title} - Shared Chat`,
    description: `A shared AI conversation: ${session.title}`,
  };
}

export default async function SharedChatPage({ params }: SharedChatPageProps) {
  const { slug } = await params;

  // Get the session by share slug
  const session = await getSessionByShareSlug(slug);

  if (!session || !session.is_public) {
    notFound();
  }

  return <ChatWindow chatId={session.id} isSharedView={true} />;
}
