import { type AttachedFileWithUrl } from "@/components/chat/utils/file-utils";
import { type ReasoningLevel } from "@/config/models";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useCallback, useEffect, useState } from "react";

export interface ChatState {
  reasoningLevel: ReasoningLevel;
  searchEnabled: boolean;
  attachedFiles: AttachedFileWithUrl[];
  showScrollToBottom: boolean;
  uiError: string | null;
}

export const useChatState = (chatId: string) => {
  const {
    getSelectedModel,
    getSelectedReasoningLevel,
    setSelectedReasoningLevel,
    selectedReasoningLevels,
  } = useModelSelectorStore();

  const [state, setState] = useState<ChatState>(() => ({
    reasoningLevel: getSelectedReasoningLevel(chatId),
    searchEnabled: false,
    attachedFiles: [],
    showScrollToBottom: false,
    uiError: null,
  }));

  const updateState = useCallback(
    (updates: Partial<ChatState> | ((prevState: ChatState) => Partial<ChatState>)) => {
      setState((prev) => {
        const newUpdates = typeof updates === "function" ? updates(prev) : updates;
        if (
          newUpdates.reasoningLevel !== undefined &&
          newUpdates.reasoningLevel !== prev.reasoningLevel
        ) {
          setSelectedReasoningLevel(chatId, newUpdates.reasoningLevel);
        }
        return { ...prev, ...newUpdates };
      });
    },
    [chatId, setSelectedReasoningLevel]
  );

  const selectedModel = getSelectedModel(chatId);

  // Effect to synchronize reasoningLevel from the store to local state
  useEffect(() => {
    const reasoningLevelInStore = selectedReasoningLevels[chatId] || "medium";
    setState((prevState) => {
      if (prevState.reasoningLevel !== reasoningLevelInStore) {
        return { ...prevState, reasoningLevel: reasoningLevelInStore };
      }
      return prevState;
    });
  }, [chatId, selectedReasoningLevels]);

  return { state, updateState, selectedModel };
};
