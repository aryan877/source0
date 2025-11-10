import {
  DEFAULT_FAVORITES,
  DEFAULT_MODEL,
  MODELS,
  type ModelCapability,
  type ModelConfig,
  type ReasoningLevel,
} from "@/config/models";
import type { AttachedFileWithUrl } from "@/components/chat/utils/file-utils";
import type { CustomUIMessage } from "@/types/custom-ui-message";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PendingChatData {
  message: CustomUIMessage;
  body: any; // Chat body to send with the message
  attachments: AttachedFileWithUrl[];
  timestamp: number;
}

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
  selectedImageGenerationEnabled: Record<string, boolean>;

  // Last Selected Model (for "new" chat)
  lastSelectedModel?: string;

  // Pending Chat Data (for new chat redirects)
  pendingChatData: PendingChatData | null;

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
  setSelectedImageGenerationEnabled: (chatId: string, enabled: boolean) => void;
  getSelectedImageGenerationEnabled: (chatId: string) => boolean;
  setPendingChatData: (data: PendingChatData | null) => void;
  clearPendingChatData: () => void;
  transferModelSelection: (fromChatId: string, toChatId: string) => void;
  clearFilters: () => void;
  resetState: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  resetStore: () => void;
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
      selectedImageGenerationEnabled: {},
      lastSelectedModel: undefined,
      pendingChatData: null,
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
          // Also update lastSelectedModel to track the most recently selected model
          lastSelectedModel: modelId,
        });
      },

      getSelectedModel: (chatId) => {
        const { selectedModels, lastSelectedModel } = get();
        // If we have a model set for this specific chat, use it
        if (selectedModels[chatId]) {
          return selectedModels[chatId];
        }
        // For "new" chat or any chat without a specific model, use last selected model
        // This ensures the most recently selected model persists
        return lastSelectedModel || DEFAULT_MODEL;
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

      setSelectedImageGenerationEnabled: (chatId, enabled) => {
        const { selectedImageGenerationEnabled } = get();
        set({
          selectedImageGenerationEnabled: {
            ...selectedImageGenerationEnabled,
            [chatId]: enabled,
          },
        });
      },

      getSelectedImageGenerationEnabled: (chatId) => {
        const { selectedImageGenerationEnabled } = get();
        return selectedImageGenerationEnabled[chatId] ?? false;
      },

      setPendingChatData: (data) => set({ pendingChatData: data }),

      clearPendingChatData: () => set({ pendingChatData: null }),

      transferModelSelection: (fromChatId, toChatId) => {
        const { selectedModels, selectedReasoningLevels, selectedSearchEnabled, selectedImageGenerationEnabled } = get();
        const modelToTransfer = selectedModels[fromChatId];
        const reasoningLevelToTransfer = selectedReasoningLevels[fromChatId];
        const searchEnabledToTransfer = selectedSearchEnabled[fromChatId];
        const imageGenerationEnabledToTransfer = selectedImageGenerationEnabled[fromChatId];

        const newSelectedModels = { ...selectedModels };
        const newSelectedReasoningLevels = { ...selectedReasoningLevels };
        const newSelectedSearchEnabled = { ...selectedSearchEnabled };
        const newSelectedImageGenerationEnabled = { ...selectedImageGenerationEnabled };

        if (modelToTransfer) {
          newSelectedModels[toChatId] = modelToTransfer;
        }
        if (reasoningLevelToTransfer) {
          newSelectedReasoningLevels[toChatId] = reasoningLevelToTransfer;
        }
        if (searchEnabledToTransfer !== undefined) {
          newSelectedSearchEnabled[toChatId] = searchEnabledToTransfer;
        }
        if (imageGenerationEnabledToTransfer !== undefined) {
          newSelectedImageGenerationEnabled[toChatId] = imageGenerationEnabledToTransfer;
        }

        set({
          selectedModels: newSelectedModels,
          selectedReasoningLevels: newSelectedReasoningLevels,
          selectedSearchEnabled: newSelectedSearchEnabled,
          selectedImageGenerationEnabled: newSelectedImageGenerationEnabled,
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
        get().clearFilters();
        set({
          viewMode: "normal",
        });
      },

      // Reset all data for logout
      resetStore: () => {
        set({
          isOpen: false,
          viewMode: "normal",
          searchQuery: "",
          selectedCapabilities: [],
          selectedProvider: null,
          favorites: [...DEFAULT_FAVORITES],
          enabledModels: MODELS.map((m) => m.id),
          selectedModels: {},
          selectedReasoningLevels: {},
          selectedSearchEnabled: {},
          selectedImageGenerationEnabled: {},
          lastSelectedModel: undefined,
          pendingChatData: null,
          hasHydrated: false,
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
        selectedImageGenerationEnabled: state.selectedImageGenerationEnabled,
        lastSelectedModel: state.lastSelectedModel,
        // Don't persist pendingChatData - it's temporary state for redirects
      }), // Persist favorites, models, and last selected model
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
        // Initialize selectedImageGenerationEnabled if it doesn't exist
        if (state && !state.selectedImageGenerationEnabled) {
          state.selectedImageGenerationEnabled = {};
        }
        // Initialize lastSelectedModel if it doesn't exist
        if (state && !state.lastSelectedModel) {
          state.lastSelectedModel = undefined;
        }
        // Mark as hydrated after rehydration
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);
