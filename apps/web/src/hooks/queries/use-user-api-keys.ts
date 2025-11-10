"use client";

import {
  clearAllUserApiKeys,
  getUserApiKeys,
  getUserByokSettings,
  removeUserApiKey,
  setUserApiKey,
  setUserByokSettings,
  toggleProviderEnabled
} from "@/services/client/user-api-keys";
import { addToast } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const USER_API_KEYS_QUERY_KEY = "user-api-keys";
const USER_BYOK_SETTINGS_QUERY_KEY = "user-byok-settings";

// Hook for fetching user API keys
export function useUserApiKeys() {
  return useQuery({
    queryKey: [USER_API_KEYS_QUERY_KEY],
    queryFn: getUserApiKeys,
  });
}

// Hook for fetching BYOK settings (GLOBAL BYOK - master on/off switch)
export function useUserByokSettings() {
  return useQuery({
    queryKey: [USER_BYOK_SETTINGS_QUERY_KEY],
    queryFn: getUserByokSettings,
  });
}

// Hook for setting/updating an API key
export function useSetApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, key }: { provider: string; key: string }) =>
      setUserApiKey(provider, key),
    onSuccess: (_, { provider }) => {
      queryClient.invalidateQueries({ queryKey: [USER_API_KEYS_QUERY_KEY] });
      addToast({
        title: "API Key Saved",
        description: `Your ${provider} API key has been saved.`,
        color: "success",
      });
    },
    onError: (error: Error) => {
      addToast({
        title: "Error",
        description: error.message,
        color: "danger",
      });
    },
  });
}

// Hook for removing an API key
export function useRemoveApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeUserApiKey,
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: [USER_API_KEYS_QUERY_KEY] });
      addToast({
        title: "API Key Removed",
        description: `Your ${provider} API key has been removed.`,
        color: "warning",
      });
    },
    onError: (error: Error) => {
      addToast({
        title: "Error",
        description: error.message,
        color: "danger",
      });
    },
  });
}

// Hook for updating BYOK settings (GLOBAL BYOK - provider-level only)
export function useSetByokSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ enabled }: { enabled: boolean }) =>
      setUserByokSettings(enabled),
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: [USER_BYOK_SETTINGS_QUERY_KEY] });
      addToast({
        title: "Setting Changed",
        description: `Bring Your Own Key is now ${enabled ? "enabled" : "disabled"}.`,
        color: "primary",
      });
    },
    onError: (error: Error) => {
      addToast({
        title: "Error",
        description: error.message,
        color: "danger",
      });
    },
  });
}

// Hook for clearing all API keys
export function useClearAllApiKeys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearAllUserApiKeys,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_API_KEYS_QUERY_KEY] });
      addToast({
        title: "All Keys Cleared",
        description: "All personal API keys have been removed.",
        color: "warning",
      });
    },
    onError: (error: Error) => {
      addToast({
        title: "Error",
        description: error.message,
        color: "danger",
      });
    },
  });
}


// Hook for toggling provider enabled/disabled (PROVIDER-LEVEL BYOK)
// This controls whether a specific provider's API key should be used
export function useToggleProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, enabled }: { provider: string; enabled: boolean }) =>
      toggleProviderEnabled(provider, enabled),
    onSuccess: (_, { provider, enabled }) => {
      queryClient.invalidateQueries({ queryKey: [USER_API_KEYS_QUERY_KEY] });
      addToast({
        title: "Provider Updated",
        description: `${provider} is now ${enabled ? "enabled" : "disabled"}.`,
        color: enabled ? "success" : "warning",
      });
    },
    onError: (error: Error) => {
      addToast({
        title: "Error",
        description: error.message,
        color: "danger",
      });
    },
  });
}

