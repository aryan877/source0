import { type AttachedFileWithUrl } from "@/components/chat/utils/file-utils";
import { type ReasoningLevel } from "@/config/models";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useCallback, useState } from "react";

export interface ChatState {
  searchEnabled: boolean;
  attachedFiles: AttachedFileWithUrl[];
  showScrollToBottom: boolean;
  uiError: string | null;
}

export const useChatState = (chatId: string) => {
  const [state, setState] = useState<ChatState>({
    searchEnabled: false,
    attachedFiles: [],
    showScrollToBottom: false,
    uiError: null,
  });

  const updateState = useCallback(
    (updates: Partial<ChatState> | ((prevState: ChatState) => Partial<ChatState>)) => {
      setState((prev) => {
        const newUpdates = typeof updates === "function" ? updates(prev) : updates;
        return { ...prev, ...newUpdates };
      });
    },
    []
  );

  const selectedModel = useModelSelectorStore(
    useCallback((state) => state.getSelectedModel(chatId), [chatId])
  );

  const reasoningLevel = useModelSelectorStore(
    useCallback((state) => state.getSelectedReasoningLevel(chatId), [chatId])
  );

  const { setSelectedReasoningLevel } = useModelSelectorStore();

  const setReasoningLevel = useCallback(
    (level: ReasoningLevel) => {
      setSelectedReasoningLevel(chatId, level);
    },
    [chatId, setSelectedReasoningLevel]
  );

  return { state, updateState, selectedModel, reasoningLevel, setReasoningLevel };
};
