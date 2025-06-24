import { Provider, PROVIDER_MAPPING } from "@/config/models";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SupportedProvider = Provider;

interface ApiKeysState {
  // API Keys State
  apiKeys: Record<SupportedProvider, string>;

  // Global BYOK Toggle
  globalByokEnabled: boolean;

  // Actions
  setApiKey: (provider: SupportedProvider, key: string) => void;
  removeApiKey: (provider: SupportedProvider) => void;
  setGlobalByokEnabled: (enabled: boolean) => void;
  getApiKey: (provider: SupportedProvider) => string | null;
  isProviderKeySet: (provider: SupportedProvider) => boolean;
  getSupportedProviders: () => SupportedProvider[];
  clearAllKeys: () => void;
  shouldUseProviderKey: (provider: SupportedProvider) => boolean;
  resetStore: () => void;
}

export const useApiKeysStore = create<ApiKeysState>()(
  persist(
    (set, get) => ({
      // Initial state
      apiKeys: {} as Record<SupportedProvider, string>,
      globalByokEnabled: false,

      // Actions
      setApiKey: (provider, key) => {
        const { apiKeys } = get();
        set({
          apiKeys: { ...apiKeys, [provider]: key.trim() },
        });
      },

      removeApiKey: (provider) => {
        const { apiKeys } = get();
        const newApiKeys = { ...apiKeys };
        delete newApiKeys[provider];
        set({ apiKeys: newApiKeys });
      },

      setGlobalByokEnabled: (enabled) => {
        set({ globalByokEnabled: enabled });
      },

      getApiKey: (provider) => {
        const { apiKeys } = get();
        return apiKeys[provider] || null;
      },

      isProviderKeySet: (provider) => {
        const { apiKeys } = get();
        return !!apiKeys[provider]?.trim();
      },

      getSupportedProviders: () => {
        return Object.keys(PROVIDER_MAPPING).filter(
          (provider) => PROVIDER_MAPPING[provider as SupportedProvider].supported
        ) as SupportedProvider[];
      },

      clearAllKeys: () => {
        set({ apiKeys: {} as Record<SupportedProvider, string> });
      },

      shouldUseProviderKey: (provider) => {
        const { globalByokEnabled, apiKeys } = get();
        return globalByokEnabled && !!apiKeys[provider]?.trim();
      },

      // Reset all data for logout
      resetStore: () => {
        set({
          apiKeys: {} as Record<SupportedProvider, string>,
          globalByokEnabled: false,
        });
      },
    }),
    {
      name: "api-keys-storage",
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        globalByokEnabled: state.globalByokEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        // Initialize empty objects if they don't exist
        if (state && !state.apiKeys) {
          state.apiKeys = {} as Record<SupportedProvider, string>;
        }
        if (state && state.globalByokEnabled === undefined) {
          state.globalByokEnabled = false;
        }
      },
    }
  )
);
