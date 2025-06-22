import { create } from "zustand";

interface UiState {
  isSearchFocused: boolean;
  focusSearch: () => void;
  blurSearch: () => void;
  resetStore: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSearchFocused: false,
  focusSearch: () => set({ isSearchFocused: true }),
  blurSearch: () => set({ isSearchFocused: false }),

  // Reset all data for logout
  resetStore: () => {
    set({
      isSearchFocused: false,
    });
  },
}));
