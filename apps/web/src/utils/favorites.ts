import { DEFAULT_FAVORITES, type ModelCapability, type ModelConfig } from "@/config/models";

// Filter models by multiple capabilities (AND logic)
export const filterModelsByCapabilities = (
  models: ModelConfig[],
  capabilities: ModelCapability[]
): ModelConfig[] => {
  if (capabilities.length === 0) return models;

  return models.filter((model) =>
    capabilities.every((capability) => model.capabilities.includes(capability))
  );
};

// Filter models by provider
export const filterModelsByProvider = (
  models: ModelConfig[],
  provider: ModelConfig["provider"]
): ModelConfig[] => {
  return models.filter((model) => model.provider === provider);
};

// Filter models by open source status
export const filterModelsByFree = (models: ModelConfig[], freeOnly: boolean): ModelConfig[] => {
  return freeOnly ? models.filter((model) => model.isOpenSource) : models;
};

// Get available capabilities from a list of models
export const getAvailableCapabilities = (models: ModelConfig[]): ModelCapability[] => {
  const capabilities = new Set<ModelCapability>();
  models.forEach((model) => {
    model.capabilities.forEach((cap) => capabilities.add(cap));
  });
  return Array.from(capabilities);
};

// Get available providers from a list of models
export const getAvailableProviders = (models: ModelConfig[]): ModelConfig["provider"][] => {
  const providers = new Set<ModelConfig["provider"]>();
  models.forEach((model) => providers.add(model.provider));
  return Array.from(providers);
};

// Default favorites (first time users) - sourced from models.ts
export const getDefaultFavorites = (): string[] => {
  return [...DEFAULT_FAVORITES];
};
