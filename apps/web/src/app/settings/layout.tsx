import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Source0",
  description: "Application settings and preferences",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
