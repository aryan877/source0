import { type AttachedFileWithUrl } from "@/components/chat/utils/file-utils";
import { DEFAULT_MODEL, type ReasoningLevel, getModelById } from "@/config/models";
import { useStorage } from "@/hooks/use-storage";
import { branchSession, getSession } from "@/services/client/chat-sessions";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { type Tables } from "@/types/supabase-types";
import { useCallback, useState } from "react";

export interface ChatState {
  attachedFiles: AttachedFileWithUrl[];
  showScrollToBottom: boolean;
  uiError: string | null;
}

export const useChat = (
  chatId: string,
  updateSessionInCache?: (session: Tables<"chat_sessions">, userId: string) => void,
  router?: { push: (path: string) => void },
  user?: { id: string } | null
) => {
  // Local state management
  const [state, setState] = useState<ChatState>({
    attachedFiles: [],
    showScrollToBottom: false,
    uiError: null,
  });

  const updateState = useCallback(
    (
      updates:
        | Partial<ChatState>
        | ((prevState: ChatState) => Partial<ChatState>)
    ) => {
      setState((prev) => {
        const newUpdates = typeof updates === "function" ? updates(prev) : updates;
        return { ...prev, ...newUpdates };
      });
    },
    []
  );

  // Model selector store access
  const {
    setSelectedModel,
    getSelectedReasoningLevel,
    setSelectedReasoningLevel,
    transferModelSelection,
    setSelectedSearchEnabled,
    setSelectedImageGenerationEnabled,
  } = useModelSelectorStore();

  // Model selector state
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

  // Model selector setters
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

  // Storage hook for file uploads
  const { uploadFiles: uploadFilesToStorage } = useStorage({
    chatId,
    onUploadError: (error) => updateState({ uiError: error }),
  });

  // Helper function to get image dimensions
  const getImageDimensions = useCallback(
    (file: File): Promise<{ width: number; height: number } | null> => {
      return new Promise((resolve) => {
        if (!file.type.startsWith("image/")) {
          resolve(null);
          return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };

        img.src = url;
      });
    },
    []
  );

  // File attachment handler
  const handleFileAttach = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      // Get dimensions for all files before creating AttachedFileWithUrl objects
      const filesWithDimensions = await Promise.all(
        files.map(async (file) => {
          const dimensions = await getImageDimensions(file);
          return { file, dimensions };
        })
      );

      const newAttachedFiles: AttachedFileWithUrl[] = filesWithDimensions.map(
        ({ file, dimensions }) => ({
          file,
          uploading: true,
          ...(dimensions && { width: dimensions.width, height: dimensions.height }),
        })
      );

      updateState((prev) => ({
        attachedFiles: [...prev.attachedFiles, ...newAttachedFiles],
      }));
      event.target.value = "";

      const { successful, failed } = await uploadFilesToStorage(files);

      updateState((prev) => ({
        attachedFiles: prev.attachedFiles.map((attachedFile) => {
          if (!attachedFile.uploading) return attachedFile;

          const successfulFile = successful.find((s) => s.name === attachedFile.file.name);
          if (successfulFile) {
            return { ...attachedFile, uploadResult: successfulFile, uploading: false };
          }

          const failedFile = failed.find((f) => f.file === attachedFile.file);
          if (failedFile) {
            return { ...attachedFile, error: failedFile.error, uploading: false };
          }

          return attachedFile;
        }),
      }));
    },
    [updateState, uploadFilesToStorage, getImageDimensions]
  );

  // File drop handler
  const handleFileDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const filesWithDimensions = await Promise.all(
        files.map(async (file) => {
          const dimensions = await getImageDimensions(file);
          return { file, dimensions };
        })
      );

      const newAttachedFiles: AttachedFileWithUrl[] = filesWithDimensions.map(
        ({ file, dimensions }) => ({
          file,
          uploading: true,
          ...(dimensions && { width: dimensions.width, height: dimensions.height }),
        })
      );

      updateState((prev) => ({
        attachedFiles: [...prev.attachedFiles, ...newAttachedFiles],
      }));

      const { successful, failed } = await uploadFilesToStorage(files);

      updateState((prev) => ({
        attachedFiles: prev.attachedFiles.map((attachedFile) => {
          if (!attachedFile.uploading) return attachedFile;

          const successfulFile = successful.find((s) => s.name === attachedFile.file.name);
          if (successfulFile) {
            return { ...attachedFile, uploadResult: successfulFile, uploading: false };
          }

          const failedFile = failed.find((f) => f.file === attachedFile.file);
          if (failedFile) {
            return { ...attachedFile, error: failedFile.error, uploading: false };
          }

          return attachedFile;
        }),
      }));
    },
    [updateState, uploadFilesToStorage, getImageDimensions]
  );

  // Remove file handler
  const handleRemoveFile = useCallback(
    (index: number) => {
      updateState((prev) => ({
        attachedFiles: prev.attachedFiles.filter((_, i) => i !== index),
      }));
    },
    [updateState]
  );

  // Branch chat handler
  const handleBranchChat = useCallback(
    async (messageId: string, modelId?: string) => {
      if (!user || !updateSessionInCache || !router) {
        updateState({ uiError: "Unable to branch chat. Please try again." });
        return;
      }

      if (chatId === "new") {
        updateState({ uiError: "Cannot branch from a new chat." });
        return;
      }

      try {
        updateState({ uiError: null });

        // Get the original session to use its title
        const originalSession = await getSession(chatId);
        const originalTitle = originalSession?.title || "Chat";
        const branchTitle = `${originalTitle} (Branch)`;

        // Create the branch
        const newSessionId = await branchSession(chatId, messageId);

        // Create a session object to update the cache with the correct title
        const branchedSession: Tables<"chat_sessions"> = {
          id: newSessionId,
          user_id: user.id,
          title: branchTitle, // Use the proper branch title
          system_prompt: originalSession?.system_prompt || null,
          branched_from_session_id: chatId,
          branched_from_message_id: messageId,
          is_public: false,
          share_slug: null,
          is_pinned: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: originalSession?.metadata || {},
        };

        // Update the session cache
        updateSessionInCache(branchedSession, user.id);

        // Transfer model selection to the new chat, and update if a new model was chosen
        transferModelSelection(chatId, newSessionId);
        if (modelId) {
          setSelectedModel(newSessionId, modelId);
        }

        // Navigate to the new chat
        router.push(`/chat/${newSessionId}`);
      } catch (error) {
        updateState({
          uiError: "Failed to branch chat. Please try again.",
        });
      }
    },
    [
      chatId,
      user,
      updateSessionInCache,
      transferModelSelection,
      router,
      updateState,
      setSelectedModel,
    ]
  );

  // Model change handler
  const handleModelChange = useCallback(
    (modelId: string) => {
      setSelectedModel(chatId, modelId);
      const newModel = getModelById(modelId);
      const currentReasoningLevel = getSelectedReasoningLevel(chatId);

      if (newModel) {
        const supportedLevels = newModel.reasoningLevels;
        // If the new model supports reasoning, check the current level
        if (supportedLevels && supportedLevels.length > 0) {
          if (!supportedLevels.includes(currentReasoningLevel)) {
            // If current level is not supported, set to the first available
            const newLevel = supportedLevels[0];
            if (newLevel) {
              setSelectedReasoningLevel(chatId, newLevel);
            }
          }
        }
      }
    },
    [chatId, setSelectedModel, getSelectedReasoningLevel, setSelectedReasoningLevel]
  );

  // Return all state and handlers
  return {
    // State
    state,
    updateState,
    selectedModel,
    reasoningLevel,
    setReasoningLevel,
    searchEnabled,
    setSearchEnabled,
    imageGenerationEnabled,
    setImageGenerationEnabled,

    // Handlers
    handleFileAttach,
    handleFileDrop,
    handleRemoveFile,
    handleBranchChat,
    handleModelChange,
  };
};
