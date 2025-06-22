import { ConditionalAppShell } from "@/components";
import { RouteTracker } from "@/components/route-tracker";
import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-brand",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Source0 - AI Chat Interface",
  description:
    "Advanced AI chat platform with multi-model support, file attachments, web search, memory, voice input, image generation, and collaborative features",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} ${orbitron.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <RouteTracker />
          <ConditionalAppShell>{children}</ConditionalAppShell>
        </Providers>
      </body>
    </html>
  );
}
