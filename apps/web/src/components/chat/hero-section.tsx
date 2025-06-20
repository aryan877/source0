"use client";

import { useAuth } from "@/hooks/useAuth";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { memo } from "react";

interface HeroSectionProps {
  onPromptSelect: (prompt: string) => void;
  className?: string;
}

const SIMPLE_PROMPTS = [
  "Write a creative story",
  "Help me plan a project",
  "Create a React component",
  "Explain a complex topic",
];

const S0Logo = ({ className = "h-14 w-14" }: { className?: string }) => (
  <div className={`${className} relative`}>
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      <rect x="4" y="4" width="56" height="56" rx="12" ry="12" className="fill-foreground" />
      <text
        x="32"
        y="42"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="20"
        fontWeight="700"
        textAnchor="middle"
        className="fill-background"
      >
        S0
      </text>
    </svg>
  </div>
);

export const HeroSection = memo(({ onPromptSelect, className = "" }: HeroSectionProps) => {
  const { showSamplePrompts } = useUserPreferencesStore();
  const { user } = useAuth();

  const getUserDisplayName = () => {
    if (!user) return null;

    const displayName =
      user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name;

    if (displayName) return displayName;

    if (user.email) {
      const emailUsername = user.email.split("@")[0];
      if (emailUsername) {
        return emailUsername
          .split(/[._-]/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
      }
    }

    return null;
  };

  const displayName = getUserDisplayName();

  if (!showSamplePrompts) {
    return null;
  }

  return (
    <div className={`flex flex-1 items-center justify-center px-6 py-12 ${className}`}>
      <div className="w-full max-w-xl text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <S0Logo className="h-14 w-14" />
        </div>

        {/* Main Heading */}
        <div className="mb-10 space-y-3">
          <h1 className="text-3xl font-medium text-foreground">
            {displayName ? `Hello, ${displayName}` : "Hello"}
          </h1>
          <p className="text-default-500">How can I help you today?</p>
        </div>

        {/* Simple Prompts */}
        <div className="space-y-2">
          {SIMPLE_PROMPTS.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onPromptSelect(prompt)}
              className="w-full rounded-xl border border-default-200 bg-background px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-default-300 hover:bg-default-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

HeroSection.displayName = "HeroSection";
