import { type AttachedFileWithUrl } from "@/components/chat/utils/file-utils";
import { type ReasoningLevel } from "@/config/models";
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

  const selectedModel = useModelSelectorStore(
    useCallback((state) => state.getSelectedModel(chatId), [chatId])
  );

  const reasoningLevel = useModelSelectorStore(
    useCallback((state) => state.getSelectedReasoningLevel(chatId), [chatId])
  );

  const searchEnabled = useModelSelectorStore(
    useCallback((state) => state.getSelectedSearchEnabled(chatId), [chatId])
  );

  const { setSelectedReasoningLevel, setSelectedSearchEnabled } = useModelSelectorStore();

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

  return {
    state,
    updateState,
    selectedModel,
    reasoningLevel,
    setReasoningLevel,
    searchEnabled,
    setSearchEnabled,
  };
};
