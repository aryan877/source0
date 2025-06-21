"use client";

import { SecureFileDisplay } from "@/components/chat";
import { useStorage } from "@/hooks/use-storage";
import { ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  Alert,
  Button,
  Checkbox,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  useDisclosure,
} from "@heroui/react";
import { useState } from "react";

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function AttachmentsTab() {
  const {
    files,
    loading: loadingFiles,
    error: filesError,
    deleteMultipleFiles,
    refreshFiles,
    isDeleting,
  } = useStorage();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure();
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "single"; id: string; path: string } | { type: "multiple"; ids: string[] } | null
  >(null);

  const handleToggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(fileId)) {
        newSelection.delete(fileId);
      } else {
        newSelection.add(fileId);
      }
      return newSelection;
    });
  };

  const handleToggleSelectAll = () => {
    if (files && selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedFiles.size > 0) {
      setDeleteTarget({ type: "multiple", ids: Array.from(selectedFiles) });
      onDeleteModalOpen();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === "single") {
        await deleteMultipleFiles([deleteTarget.path]);
      } else {
        const filesToDelete = files.filter((f) => deleteTarget.ids.includes(f.id));
        const paths = filesToDelete.map((f) => f.path);
        await deleteMultipleFiles(paths);
        setSelectedFiles(new Set());
      }
    } finally {
      onDeleteModalClose();
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="mb-2 text-xl font-bold text-foreground">Uploaded Attachments</h3>
          <p className="mb-6 text-sm text-default-600">
            Manage all files you&apos;ve uploaded across chats
          </p>
        </div>
        <Button
          variant="light"
          color="primary"
          onPress={refreshFiles}
          startContent={<ArrowPathIcon className="h-4 w-4" />}
          className="mb-6"
        >
          Refresh
        </Button>
      </div>

      {filesError && (
        <Alert color="danger" className="mb-6">
          <div className="flex items-center justify-between">
            <span>{filesError}</span>
          </div>
        </Alert>
      )}

      {selectedFiles.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-divider bg-content2 p-4">
          <span className="text-sm font-medium text-foreground">
            {selectedFiles.size} file(s) selected
          </span>
          <Button
            color="danger"
            variant="flat"
            size="sm"
            startContent={<TrashIcon className="h-4 w-4" />}
            onPress={handleDeleteSelected}
            isDisabled={isDeleting || selectedFiles.size === 0}
          >
            Delete Selected
          </Button>
        </div>
      )}

      {loadingFiles ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading attachments..." />
        </div>
      ) : !files || files.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mb-4 text-6xl">📎</div>
          <p className="font-medium text-default-500">No attachments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center border-b border-divider pb-2">
            <Checkbox
              isSelected={selectedFiles.size > 0 && selectedFiles.size === files.length}
              isIndeterminate={selectedFiles.size > 0 && selectedFiles.size < files.length}
              onValueChange={handleToggleSelectAll}
            />
            <span className="ml-4 text-sm font-semibold text-foreground">
              {selectedFiles.size > 0 ? `${selectedFiles.size} selected` : "Select All"}
            </span>
          </div>
          {files.map((file) => (
            <div
              key={file.id}
              className={`rounded-xl border p-4 transition-colors ${
                selectedFiles.has(file.id)
                  ? "border-primary bg-primary/10"
                  : "border-divider bg-content1"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 items-start gap-4">
                  <Checkbox
                    isSelected={selectedFiles.has(file.id)}
                    onValueChange={() => handleToggleFileSelection(file.id)}
                    className="mt-1 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="max-w-xs">
                      <SecureFileDisplay
                        url={file.url}
                        mimeType={file.contentType}
                        fileName={file.name}
                        isImage={file.contentType.startsWith("image/")}
                        className="!mb-0"
                        displaySize="small"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-default-600">
                      <span className="font-medium">{formatFileSize(file.size)}</span>
                      <span className="text-default-400">/</span>
                      <span>{file.chatFolder}</span>
                      <span className="text-default-400">/</span>
                      <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="light"
                  isIconOnly
                  color="danger"
                  onPress={() => {
                    setDeleteTarget({ type: "single", id: file.id, path: file.path });
                    onDeleteModalOpen();
                  }}
                  isDisabled={isDeleting}
                >
                  <TrashIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} size="md">
        <ModalContent>
          <ModalHeader>Confirm Deletion</ModalHeader>
          <ModalBody>
            <p className="text-default-700">
              Are you sure you want to delete{" "}
              {deleteTarget?.type === "multiple"
                ? `${deleteTarget.ids.length} file(s)`
                : "this file"}
              ? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteModalClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button color="danger" onPress={handleConfirmDelete} isLoading={isDeleting}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
