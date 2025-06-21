import { AttachedFileWithUrl } from "@/components/chat/utils/file-utils";
import { getModelById } from "@/config/models";
import { type ChatState } from "@/hooks/use-chat-state";
import { useStorage } from "@/hooks/use-storage";
import { branchSession, ChatSession, getSession } from "@/services/chat-sessions";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useCallback } from "react";

export const useChatHandlers = (
  chatId: string,
  state: ChatState,
  updateState: (
    updates: Partial<ChatState> | ((prevState: ChatState) => Partial<ChatState>)
  ) => void,
  updateSessionInCache?: (session: ChatSession, userId: string) => void,
  transferModelSelection?: (fromId: string, toId: string) => void,
  router?: { push: (path: string) => void },
  user?: { id: string } | null
) => {
  const { setSelectedModel, getSelectedReasoningLevel, setSelectedReasoningLevel } =
    useModelSelectorStore();
  const { uploadFiles: uploadFilesToStorage } = useStorage({
    chatId,
    onUploadError: (error) => updateState({ uiError: error }),
  });

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

  const handleRemoveFile = useCallback(
    (index: number) => {
      updateState((prev) => ({
        attachedFiles: prev.attachedFiles.filter((_, i) => i !== index),
      }));
    },
    [updateState]
  );

  const handleBranchChat = useCallback(
    async (messageId: string, modelId?: string) => {
      if (!user || !updateSessionInCache || !transferModelSelection || !router) {
        console.error("Missing required dependencies for branching");
        updateState({ uiError: "Unable to branch chat. Please try again." });
        return;
      }

      if (chatId === "new") {
        updateState({ uiError: "Cannot branch from a new chat." });
        return;
      }

      try {
        updateState({ uiError: null });
        console.log("Branching chat from message:", messageId);

        // Get the original session to use its title
        const originalSession = await getSession(chatId);
        const originalTitle = originalSession?.title || "Chat";
        const branchTitle = `${originalTitle} (Branch)`;

        // Create the branch
        const newSessionId = await branchSession(chatId, messageId);

        // Create a session object to update the cache with the correct title
        const branchedSession: ChatSession = {
          id: newSessionId,
          user_id: user.id,
          title: branchTitle, // Use the proper branch title
          system_prompt: originalSession?.system_prompt || null,
          branched_from_session_id: chatId,
          branched_from_message_id: messageId,
          is_public: false,
          share_slug: null,
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
        console.error("Error branching chat:", error);
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

  return {
    handleFileAttach,
    handleRemoveFile,
    handleBranchChat,
    handleModelChange,
  };
};
