import { AttachedFileWithUrl } from "@/components/chat/utils/file-utils";
import { type ReasoningLevel } from "@/config/models";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useCallback, useState } from "react";

export interface ChatState {
  reasoningLevel: ReasoningLevel;
  searchEnabled: boolean;
  attachedFiles: AttachedFileWithUrl[];
  showScrollToBottom: boolean;
  uiError: string | null;
}

export const useChatState = (chatId: string) => {
  const { getSelectedModel } = useModelSelectorStore();

  const [state, setState] = useState<ChatState>({
    reasoningLevel: "medium" as ReasoningLevel,
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

  const selectedModel = getSelectedModel(chatId);

  return { state, updateState, selectedModel };
};
