import { type ModelCapability, type ModelConfig, DEFAULT_FAVORITES } from "@/config/models";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ModelSelectorState {
  // UI State
  isOpen: boolean;
  viewMode: "normal" | "expanded";
  searchQuery: string;

  // Filter State
  selectedCapabilities: ModelCapability[];
  selectedProvider: ModelConfig["provider"] | null;
  showFreeOnly: boolean;

  // Favorites State
  favorites: string[];

  // Actions
  setIsOpen: (isOpen: boolean) => void;
  toggleDropdown: () => void;
  setViewMode: (mode: "normal" | "expanded") => void;
  setSearchQuery: (query: string) => void;
  setSelectedCapabilities: (capabilities: ModelCapability[]) => void;
  setSelectedProvider: (provider: ModelConfig["provider"] | null) => void;
  setShowFreeOnly: (showFreeOnly: boolean) => void;
  setFavorites: (favorites: string[]) => void;
  toggleFavorite: (modelId: string) => void;
  clearFilters: () => void;
  resetState: () => void;
  closeAndReset: () => void;
}

export const useModelSelectorStore = create<ModelSelectorState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOpen: false,
      viewMode: "normal",
      searchQuery: "",
      selectedCapabilities: [],
      selectedProvider: null,
      showFreeOnly: false,
      favorites: [],

      // Actions
      setIsOpen: (isOpen) => {
        set({ isOpen });
        if (!isOpen) {
          // Reset filters when closing
          set({
            viewMode: "normal",
            searchQuery: "",
            selectedCapabilities: [],
            selectedProvider: null,
            showFreeOnly: false,
          });
        }
      },

      toggleDropdown: () => {
        const { isOpen } = get();
        get().setIsOpen(!isOpen);
      },

      setViewMode: (viewMode) => set({ viewMode }),

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      setSelectedCapabilities: (selectedCapabilities) => set({ selectedCapabilities }),

      setSelectedProvider: (selectedProvider) => set({ selectedProvider }),

      setShowFreeOnly: (showFreeOnly) => set({ showFreeOnly }),

      setFavorites: (favorites) => set({ favorites }),

      toggleFavorite: (modelId) => {
        const { favorites } = get();
        const newFavorites = favorites.includes(modelId)
          ? favorites.filter((id) => id !== modelId)
          : [...favorites, modelId];
        set({ favorites: newFavorites });
      },

      clearFilters: () => {
        set({
          searchQuery: "",
          selectedCapabilities: [],
          selectedProvider: null,
          showFreeOnly: false,
        });
      },

      resetState: () => {
        set({
          viewMode: "normal",
          searchQuery: "",
          selectedCapabilities: [],
          selectedProvider: null,
          showFreeOnly: false,
        });
      },

      closeAndReset: () => {
        set({
          isOpen: false,
          viewMode: "normal",
          searchQuery: "",
          selectedCapabilities: [],
          selectedProvider: null,
          showFreeOnly: false,
        });
      },
    }),
    {
      name: "model-selector-storage",
      partialize: (state) => ({ favorites: state.favorites }), // Only persist favorites
      onRehydrateStorage: () => (state) => {
        // Initialize with default favorites if none exist
        if (state && state.favorites.length === 0) {
          state.favorites = [...DEFAULT_FAVORITES];
        }
      },
    }
  )
);
