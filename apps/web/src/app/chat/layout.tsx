import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat - AlmostT3",
  description: "AI chat conversation",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
