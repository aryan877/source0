import {
  type ModelCapability,
  type ModelConfig,
  DEFAULT_FAVORITES,
  DEFAULT_MODEL,
} from "@/config/models";
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

  // Favorites State
  favorites: string[];

  // Selected Model State
  selectedModel: string;

  // Hydration State
  hasHydrated: boolean;

  // Actions
  setIsOpen: (isOpen: boolean) => void;
  toggleDropdown: () => void;
  setViewMode: (mode: "normal" | "expanded") => void;
  setSearchQuery: (query: string) => void;
  setSelectedCapabilities: (capabilities: ModelCapability[]) => void;
  setSelectedProvider: (provider: ModelConfig["provider"] | null) => void;
  setFavorites: (favorites: string[]) => void;
  toggleFavorite: (modelId: string) => void;
  setSelectedModel: (modelId: string) => void;
  clearFilters: () => void;
  resetState: () => void;
  closeAndReset: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
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
      favorites: [],
      selectedModel: DEFAULT_MODEL,
      hasHydrated: false,

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

      setFavorites: (favorites) => set({ favorites }),

      toggleFavorite: (modelId) => {
        const { favorites } = get();
        const newFavorites = favorites.includes(modelId)
          ? favorites.filter((id) => id !== modelId)
          : [...favorites, modelId];
        set({ favorites: newFavorites });
      },

      setSelectedModel: (modelId) => set({ selectedModel: modelId }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      clearFilters: () => {
        set({
          searchQuery: "",
          selectedCapabilities: [],
          selectedProvider: null,
        });
      },

      resetState: () => {
        set({
          viewMode: "normal",
          searchQuery: "",
          selectedCapabilities: [],
          selectedProvider: null,
        });
      },

      closeAndReset: () => {
        set({
          isOpen: false,
          viewMode: "normal",
          searchQuery: "",
          selectedCapabilities: [],
          selectedProvider: null,
        });
      },
    }),
    {
      name: "model-selector-storage",
      partialize: (state) => ({
        favorites: state.favorites,
        selectedModel: state.selectedModel,
      }), // Persist both favorites and selected model
      onRehydrateStorage: () => (state) => {
        // Initialize with default favorites if none exist
        if (state && state.favorites.length === 0) {
          state.favorites = [...DEFAULT_FAVORITES];
        }
        // Initialize with default model if none exists
        if (state && !state.selectedModel) {
          state.selectedModel = DEFAULT_MODEL;
        }
        // Mark as hydrated after rehydration
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);
