import { AttachedFileWithUrl } from "@/components/chat/utils/file-utils";
import { type ChatState } from "@/hooks/use-chat-state";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useModelSelectorStore } from "@/stores/model-selector-store";
import { useCallback } from "react";

export const useChatHandlers = (
  chatId: string,
  updateState: (
    updates: Partial<ChatState> | ((prevState: ChatState) => Partial<ChatState>)
  ) => void
) => {
  const { setSelectedModel } = useModelSelectorStore();
  const { uploadFilesToStorage } = useFileUpload(chatId, (error) =>
    updateState({ uiError: error })
  );

  const handleFileAttach = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      const newAttachedFiles: AttachedFileWithUrl[] = files.map((file) => ({
        file,
        uploading: true,
      }));

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
    [updateState, uploadFilesToStorage]
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      updateState((prev) => ({
        attachedFiles: prev.attachedFiles.filter((_, i) => i !== index),
      }));
    },
    [updateState]
  );

  const handleForkChat = useCallback((messageId: string) => {
    console.log("Fork chat from message:", messageId);
  }, []);

  const handleModelChange = useCallback(
    (model: string) => {
      setSelectedModel(chatId, model);
    },
    [chatId, setSelectedModel]
  );

  return {
    handleFileAttach,
    handleRemoveFile,
    handleForkChat,
    handleModelChange,
  };
};
