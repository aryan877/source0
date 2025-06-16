import {
  DEFAULT_FAVORITES,
  DEFAULT_MODEL,
  type ModelCapability,
  type ModelConfig,
  type ReasoningLevel,
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

  // Selected Model State (per chat)
  selectedModels: Record<string, string>;
  selectedReasoningLevels: Record<string, ReasoningLevel>;

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
  setSelectedModel: (chatId: string, modelId: string) => void;
  getSelectedModel: (chatId: string) => string;
  setSelectedReasoningLevel: (chatId: string, level: ReasoningLevel) => void;
  getSelectedReasoningLevel: (chatId: string) => ReasoningLevel;
  transferModelSelection: (fromChatId: string, toChatId: string) => void;
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
      selectedModels: {},
      selectedReasoningLevels: {},
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

      setSelectedModel: (chatId, modelId) => {
        const { selectedModels } = get();
        set({
          selectedModels: {
            ...selectedModels,
            [chatId]: modelId,
          },
        });
      },

      getSelectedModel: (chatId) => {
        const { selectedModels } = get();
        return selectedModels[chatId] || DEFAULT_MODEL;
      },

      setSelectedReasoningLevel: (chatId, level) => {
        const { selectedReasoningLevels } = get();
        set({
          selectedReasoningLevels: {
            ...selectedReasoningLevels,
            [chatId]: level,
          },
        });
      },

      getSelectedReasoningLevel: (chatId) => {
        const { selectedReasoningLevels } = get();
        return selectedReasoningLevels[chatId] || "medium";
      },

      transferModelSelection: (fromChatId, toChatId) => {
        const { selectedModels, selectedReasoningLevels } = get();
        const modelToTransfer = selectedModels[fromChatId];
        const reasoningLevelToTransfer = selectedReasoningLevels[fromChatId];

        const newSelectedModels = { ...selectedModels };
        const newSelectedReasoningLevels = { ...selectedReasoningLevels };

        if (modelToTransfer) {
          newSelectedModels[toChatId] = modelToTransfer;
        }
        if (reasoningLevelToTransfer) {
          newSelectedReasoningLevels[toChatId] = reasoningLevelToTransfer;
        }

        set({
          selectedModels: newSelectedModels,
          selectedReasoningLevels: newSelectedReasoningLevels,
        });
      },

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
        selectedModels: state.selectedModels,
        selectedReasoningLevels: state.selectedReasoningLevels,
      }), // Persist both favorites and selected models per chat
      onRehydrateStorage: () => (state) => {
        // Initialize with default favorites if none exist
        if (state && state.favorites.length === 0) {
          state.favorites = [...DEFAULT_FAVORITES];
        }
        // Initialize selectedModels if it doesn't exist
        if (state && !state.selectedModels) {
          state.selectedModels = {};
        }
        // Initialize selectedReasoningLevels if it doesn't exist
        if (state && !state.selectedReasoningLevels) {
          state.selectedReasoningLevels = {};
        }
        // Mark as hydrated after rehydration
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);
