import { create } from "zustand";
import { persist } from "zustand/middleware";

export const themeOptions = [
  { key: "light", label: "Light", icon: "☀️", base: "light" },
  { key: "dark", label: "Dark", icon: "🌙", base: "dark" },
  { key: "ocean", label: "Ocean", icon: "🌊", base: "light" },
  { key: "forest", label: "Forest", icon: "🌲", base: "dark" },
  { key: "sunset", label: "Sunset", icon: "🌅", base: "light" },
  { key: "lavender", label: "Lavender", icon: "💜", base: "dark" },
  { key: "rose", label: "Rose", icon: "🌹", base: "light" },
] as const;

export type ThemeKey = (typeof themeOptions)[number]["key"];

interface UserPreferencesState {
  assistantName: string;
  userTraits: string;
  hidePersonalInfo: boolean;
  showSamplePrompts: boolean;
  memoryEnabled: boolean;
  suggestQuestions: boolean;
  setAssistantName: (name: string) => void;
  setUserTraits: (traits: string) => void;
  setHidePersonalInfo: (hide: boolean) => void;
  setShowSamplePrompts: (show: boolean) => void;
  setMemoryEnabled: (enabled: boolean) => void;
  setSuggestQuestions: (enabled: boolean) => void;
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      assistantName: "Source0",
      userTraits: "",
      hidePersonalInfo: false,
      showSamplePrompts: true,
      memoryEnabled: true,
      suggestQuestions: false,
      setAssistantName: (name) => set({ assistantName: name }),
      setUserTraits: (traits) => set({ userTraits: traits }),
      setHidePersonalInfo: (hide) => set({ hidePersonalInfo: hide }),
      setShowSamplePrompts: (show) => set({ showSamplePrompts: show }),
      setMemoryEnabled: (enabled) => set({ memoryEnabled: enabled }),
      setSuggestQuestions: (enabled) => set({ suggestQuestions: enabled }),
    }),
    {
      name: "user-preferences-storage",
    }
  )
);
