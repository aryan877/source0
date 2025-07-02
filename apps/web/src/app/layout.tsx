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
  title: {
    template: "%s | Source0",
    default: "Source0 - AI Chat Interface",
  },
  description:
    "Advanced AI chat platform with multi-model support, file attachments, web search, memory, voice input, image generation, and collaborative features",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://source0.chat"),
  keywords: [
    "AI chat",
    "artificial intelligence",
    "multi-model AI",
    "file attachments",
    "web search",
    "voice input",
    "image generation",
    "collaborative AI",
    "chat interface",
    "machine learning",
    "AI assistant",
    "conversational AI",
  ],
  authors: [
    {
      name: "Source0 Team",
    },
  ],
  publisher: "Source0",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Source0",
    title: "Source0 - AI Chat Interface",
    description:
      "Advanced AI chat platform with multi-model support, file attachments, web search, memory, voice input, image generation, and collaborative features",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Source0 - Advanced AI Chat Interface",
        type: "image/png",
      },
      {
        url: "/opengraph-image-square.png",
        width: 1200,
        height: 1200,
        alt: "Source0 - Advanced AI Chat Interface",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Source0 - AI Chat Interface",
    description:
      "Advanced AI chat platform with multi-model support, file attachments, web search, memory, voice input, image generation, and collaborative features",
    images: [
      {
        url: "/twitter-image.png",
        width: 1200,
        height: 630,
        alt: "Source0 - Advanced AI Chat Interface",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#000000",
      },
    ],
  },
  manifest: "/site.webmanifest",
  category: "technology",
  classification: "AI Chat Platform",
  referrer: "origin-when-cross-origin",
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  verification: {
    // Add your verification IDs here when you have them
    // google: "your-google-verification-id",
    // yandex: "your-yandex-verification-id",
    // yahoo: "your-yahoo-verification-id",
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
    },
  },
  other: {
    "msapplication-TileColor": "#000000",
    "msapplication-config": "/browserconfig.xml",
  },
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
