import { type ModelCapability, type ModelConfig } from "@/config/models";
import { useMemo } from "react";

export function useModelFiltering(
  allModels: ModelConfig[],
  searchQuery: string,
  selectedCapabilities: ModelCapability[],
  selectedProvider: ModelConfig["provider"] | null,
  favorites?: string[]
) {
  return useMemo(() => {
    let models = [...allModels];

    // 1. Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      models = models.filter((model) => {
        const searchText = `${model.name} ${model.provider} ${model.description}`.toLowerCase();
        return searchText.includes(query);
      });
    }

    // 2. Filter by capabilities (if any are selected)
    if (selectedCapabilities.length > 0) {
      models = models.filter((model) =>
        selectedCapabilities.every((cap) => model.capabilities.includes(cap))
      );
    }

    // 3. Filter by provider (if one is selected)
    if (selectedProvider) {
      models = models.filter((model) => model.provider === selectedProvider);
    }

    // 4. Sort the results
    return models.sort((a, b) => {
      // If favorites are provided, prioritize them
      if (favorites) {
        const aIsFav = favorites.includes(a.id);
        const bIsFav = favorites.includes(b.id);
        if (aIsFav && !bIsFav) return -1;
        if (!aIsFav && bIsFav) return 1;
      }
      // Otherwise, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [allModels, searchQuery, selectedCapabilities, selectedProvider, favorites]);
}
