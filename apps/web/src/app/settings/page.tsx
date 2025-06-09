"use client";

import { Settings } from "@/components";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push("/");
  };

  return <Settings onBack={handleBack} />;
}
