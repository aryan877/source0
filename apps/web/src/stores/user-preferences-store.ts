import { create } from "zustand";
import { persist } from "zustand/middleware";

export const themeOptions = [
  { key: "light", label: "Light", base: "light" },
  { key: "dark", label: "Dark", base: "dark" },
  { key: "ocean", label: "Ocean", base: "light" },
  { key: "forest", label: "Forest", base: "dark" },
  { key: "sunset", label: "Sunset", base: "light" },
  { key: "lavender", label: "Lavender", base: "dark" },
  { key: "rose", label: "Rose", base: "light" },
] as const;

export const themeColorMap = {
  light: ["#737373", "#525252"],
  dark: ["#a3a3a3", "#737373"],
  ocean: ["#06b6d4", "#0891b2"],
  forest: ["#22c55e", "#16a34a"],
  sunset: ["#ef4444", "#dc2626"],
  lavender: ["#a855f7", "#9333ea"],
  rose: ["#f43f5e", "#e11d48"],
} as const;

export type ThemeKey = (typeof themeOptions)[number]["key"];

export const fontSizes = [
  { key: "xs", label: "X-Small" },
  { key: "sm", label: "Small" },
  { key: "base", label: "Medium" },
  { key: "lg", label: "Large" },
  { key: "xl", label: "X-Large" },
] as const;

export type FontSizeKey = (typeof fontSizes)[number]["key"];

interface UserPreferencesState {
  assistantName: string;
  userTraits: string;
  hidePersonalInfo: boolean;
  showSamplePrompts: boolean;
  memoryEnabled: boolean;
  suggestQuestions: boolean;
  showChatNavigator: boolean;
  fontSize: FontSizeKey;
  setAssistantName: (name: string) => void;
  setUserTraits: (traits: string) => void;
  setHidePersonalInfo: (hide: boolean) => void;
  setShowSamplePrompts: (show: boolean) => void;
  setMemoryEnabled: (enabled: boolean) => void;
  setSuggestQuestions: (enabled: boolean) => void;
  setShowChatNavigator: (show: boolean) => void;
  setFontSize: (size: FontSizeKey) => void;
  resetStore: () => void;
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      assistantName: "Source0",
      userTraits: "",
      hidePersonalInfo: false,
      showSamplePrompts: true,
      memoryEnabled: true,
      suggestQuestions: true,
      showChatNavigator: true,
      fontSize: "sm",
      setAssistantName: (name) => set({ assistantName: name }),
      setUserTraits: (traits) => set({ userTraits: traits }),
      setHidePersonalInfo: (hide) => set({ hidePersonalInfo: hide }),
      setShowSamplePrompts: (show) => set({ showSamplePrompts: show }),
      setMemoryEnabled: (enabled) => set({ memoryEnabled: enabled }),
      setSuggestQuestions: (enabled) => set({ suggestQuestions: enabled }),
      setShowChatNavigator: (show) => set({ showChatNavigator: show }),
      setFontSize: (size) => set({ fontSize: size }),
      resetStore: () => {
        set({
          assistantName: "Source0",
          userTraits: "",
          hidePersonalInfo: false,
          showSamplePrompts: true,
          memoryEnabled: true,
          suggestQuestions: true,
          showChatNavigator: true,
          fontSize: "sm",
        });
      },
    }),
    {
      name: "user-preferences-storage",
    }
  )
);
