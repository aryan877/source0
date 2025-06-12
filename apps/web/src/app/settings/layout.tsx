import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - AlmostT3",
  description: "Application settings and preferences",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
