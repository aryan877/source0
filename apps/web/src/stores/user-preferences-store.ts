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
  setAssistantName: (name: string) => void;
  setUserTraits: (traits: string) => void;
  setHidePersonalInfo: (hide: boolean) => void;
  setShowSamplePrompts: (show: boolean) => void;
  setMemoryEnabled: (enabled: boolean) => void;
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      assistantName: "AI Assistant",
      userTraits: "I prefer concise responses and enjoy technical discussions.",
      hidePersonalInfo: false,
      showSamplePrompts: true,
      memoryEnabled: true,
      setAssistantName: (name) => set({ assistantName: name }),
      setUserTraits: (traits) => set({ userTraits: traits }),
      setHidePersonalInfo: (hide) => set({ hidePersonalInfo: hide }),
      setShowSamplePrompts: (show) => set({ showSamplePrompts: show }),
      setMemoryEnabled: (enabled) => set({ memoryEnabled: enabled }),
    }),
    {
      name: "user-preferences-storage",
    }
  )
);
