import {
  DEFAULT_FAVORITES,
  DEFAULT_MODEL,
  MODELS,
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

  // Enabled Models State
  enabledModels: string[];

  // Selected Model State (per chat)
  selectedModels: Record<string, string>;
  selectedReasoningLevels: Record<string, ReasoningLevel>;
  selectedSearchEnabled: Record<string, boolean>;

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
  toggleModelEnabled: (modelId: string) => void;
  setSelectedModel: (chatId: string, modelId: string) => void;
  getSelectedModel: (chatId: string) => string;
  setSelectedReasoningLevel: (chatId: string, level: ReasoningLevel) => void;
  getSelectedReasoningLevel: (chatId: string) => ReasoningLevel;
  setSelectedSearchEnabled: (chatId: string, enabled: boolean) => void;
  getSelectedSearchEnabled: (chatId: string) => boolean;
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
      enabledModels: [],
      selectedModels: {},
      selectedReasoningLevels: {},
      selectedSearchEnabled: {},
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

      toggleModelEnabled: (modelId) => {
        const { enabledModels } = get();
        const newEnabledModels = enabledModels.includes(modelId)
          ? enabledModels.filter((id) => id !== modelId)
          : [...enabledModels, modelId];
        set({ enabledModels: newEnabledModels });
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

      setSelectedSearchEnabled: (chatId, enabled) => {
        const { selectedSearchEnabled } = get();
        set({
          selectedSearchEnabled: {
            ...selectedSearchEnabled,
            [chatId]: enabled,
          },
        });
      },

      getSelectedSearchEnabled: (chatId) => {
        const { selectedSearchEnabled } = get();
        // Default to true for new chats, false otherwise (or based on model capabilities)
        return selectedSearchEnabled[chatId] ?? false;
      },

      transferModelSelection: (fromChatId, toChatId) => {
        const { selectedModels, selectedReasoningLevels, selectedSearchEnabled } = get();
        const modelToTransfer = selectedModels[fromChatId];
        const reasoningLevelToTransfer = selectedReasoningLevels[fromChatId];
        const searchEnabledToTransfer = selectedSearchEnabled[fromChatId];

        const newSelectedModels = { ...selectedModels };
        const newSelectedReasoningLevels = { ...selectedReasoningLevels };
        const newSelectedSearchEnabled = { ...selectedSearchEnabled };

        if (modelToTransfer) {
          newSelectedModels[toChatId] = modelToTransfer;
        }
        if (reasoningLevelToTransfer) {
          newSelectedReasoningLevels[toChatId] = reasoningLevelToTransfer;
        }
        if (searchEnabledToTransfer !== undefined) {
          newSelectedSearchEnabled[toChatId] = searchEnabledToTransfer;
        }

        set({
          selectedModels: newSelectedModels,
          selectedReasoningLevels: newSelectedReasoningLevels,
          selectedSearchEnabled: newSelectedSearchEnabled,
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
        enabledModels: state.enabledModels,
        selectedModels: state.selectedModels,
        selectedReasoningLevels: state.selectedReasoningLevels,
        selectedSearchEnabled: state.selectedSearchEnabled,
      }), // Persist both favorites and selected models per chat
      onRehydrateStorage: () => (state) => {
        // Initialize with default favorites if none exist
        if (state && (!state.favorites || state.favorites.length === 0)) {
          state.favorites = [...DEFAULT_FAVORITES];
        }
        // Always sync enabledModels with current MODELS to include new models
        if (state) {
          const allModelIds = MODELS.map((m) => m.id);
          if (!state.enabledModels || state.enabledModels.length === 0) {
            // If no enabled models, enable all
            state.enabledModels = [...allModelIds];
          } else {
            // Merge existing enabled models with any new models that were added
            const existingEnabled = new Set(state.enabledModels);
            const newModels = allModelIds.filter((id) => !existingEnabled.has(id));
            if (newModels.length > 0) {
              state.enabledModels = [...state.enabledModels, ...newModels];
            }
          }
        }
        // Initialize selectedModels if it doesn't exist
        if (state && !state.selectedModels) {
          state.selectedModels = {};
        }
        // Initialize selectedReasoningLevels if it doesn't exist
        if (state && !state.selectedReasoningLevels) {
          state.selectedReasoningLevels = {};
        }
        // Initialize selectedSearchEnabled if it doesn't exist
        if (state && !state.selectedSearchEnabled) {
          state.selectedSearchEnabled = {};
        }
        // Mark as hydrated after rehydration
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);
