"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the first chat
    router.replace("/chat/1");
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
        <p className="text-default-500">Loading chat...</p>
      </div>
    </div>
  );
}
