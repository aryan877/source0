import { type AttachedFileWithUrl } from "@/components/chat/utils/file-utils";
import { DEFAULT_MODEL, type ReasoningLevel } from "@/config/models";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useCallback, useState } from "react";

export interface ChatState {
  attachedFiles: AttachedFileWithUrl[];
  showScrollToBottom: boolean;
  uiError: string | null;
}

export const useChatState = (chatId: string) => {
  const [state, setState] = useState<Omit<ChatState, "searchEnabled">>({
    attachedFiles: [],
    showScrollToBottom: false,
    uiError: null,
  });

  const updateState = useCallback(
    (
      updates:
        | Partial<Omit<ChatState, "searchEnabled">>
        | ((
            prevState: Omit<ChatState, "searchEnabled">
          ) => Partial<Omit<ChatState, "searchEnabled">>)
    ) => {
      setState((prev) => {
        const newUpdates = typeof updates === "function" ? updates(prev) : updates;
        return { ...prev, ...newUpdates };
      });
    },
    []
  );

  // Select selectedModel - will automatically update when lastSelectedModel changes
  const selectedModel = useModelSelectorStore(
    useCallback(
      (state) => state.selectedModels[chatId] || state.lastSelectedModel || DEFAULT_MODEL,
      [chatId, DEFAULT_MODEL]
    )
  );

  const reasoningLevel = useModelSelectorStore(
    useCallback((state) => state.getSelectedReasoningLevel(chatId), [chatId])
  );

  const searchEnabled = useModelSelectorStore(
    useCallback((state) => state.getSelectedSearchEnabled(chatId), [chatId])
  );

  const imageGenerationEnabled = useModelSelectorStore(
    useCallback((state) => state.getSelectedImageGenerationEnabled(chatId), [chatId])
  );

  const { setSelectedReasoningLevel, setSelectedSearchEnabled, setSelectedImageGenerationEnabled } = useModelSelectorStore();

  const setReasoningLevel = useCallback(
    (level: ReasoningLevel) => {
      setSelectedReasoningLevel(chatId, level);
    },
    [chatId, setSelectedReasoningLevel]
  );

  const setSearchEnabled = useCallback(
    (enabled: boolean) => {
      setSelectedSearchEnabled(chatId, enabled);
    },
    [chatId, setSelectedSearchEnabled]
  );

  const setImageGenerationEnabled = useCallback(
    (enabled: boolean) => {
      setSelectedImageGenerationEnabled(chatId, enabled);
    },
    [chatId, setSelectedImageGenerationEnabled]
  );

  return {
    state,
    updateState,
    selectedModel,
    reasoningLevel,
    setReasoningLevel,
    searchEnabled,
    setSearchEnabled,
    imageGenerationEnabled,
    setImageGenerationEnabled,
  };
};
