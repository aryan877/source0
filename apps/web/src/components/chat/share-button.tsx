"use client";

import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { useAuth } from "@/hooks/useAuth";
import { makePrivate, makePublic, type ChatSession } from "@/services/chat-sessions";
import { chatSessionsKeys } from "@/utils/query-keys";
import {
  CheckIcon,
  ClipboardDocumentIcon,
  GlobeAltIcon,
  LockClosedIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

interface ShareButtonProps {
  session: ChatSession;
  className?: string;
}

export function ShareButton({ session, className = "" }: ShareButtonProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const { updateSessionInCache } = useChatSessions();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Generate share URL when session has a share_slug
  useEffect(() => {
    if (session.share_slug) {
      const url = `${window.location.origin}/chat/shared/${session.share_slug}`;
      setShareUrl(url);
    } else {
      setShareUrl("");
    }
  }, [session.share_slug]);

  const handleMakePublic = useCallback(async () => {
    if (!user) return;

    setIsSharing(true);
    try {
      const shareSlug = await makePublic(session.id);
      const updatedSession: ChatSession = {
        ...session,
        is_public: true,
        share_slug: shareSlug,
      };

      // Update both the sessions list and individual session cache
      updateSessionInCache(updatedSession, user.id);
      queryClient.setQueryData(chatSessionsKeys.byId(session.id), updatedSession);
    } catch (error) {
      console.error("Failed to make session public:", error);
    } finally {
      setIsSharing(false);
    }
  }, [session, user, updateSessionInCache, queryClient]);

  const handleMakePrivate = useCallback(async () => {
    if (!user) return;

    setIsSharing(true);
    try {
      await makePrivate(session.id);
      const updatedSession: ChatSession = {
        ...session,
        is_public: false,
        share_slug: null,
      };

      // Update both the sessions list and individual session cache
      updateSessionInCache(updatedSession, user.id);
      queryClient.setQueryData(chatSessionsKeys.byId(session.id), updatedSession);
    } catch (error) {
      console.error("Failed to make session private:", error);
    } finally {
      setIsSharing(false);
    }
  }, [session, user, updateSessionInCache, queryClient]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (fallbackError) {
        console.error("Fallback copy failed:", fallbackError);
      }
      document.body.removeChild(textArea);
    }
  }, [shareUrl]);

  // Don't show share button for "new" sessions or if user is not the owner
  if (session.id === "new" || session.user_id !== user?.id) {
    return null;
  }

  return (
    <>
      <Button
        onPress={onOpen}
        variant="flat"
        size="sm"
        startContent={<ShareIcon className="h-4 w-4" />}
        className={className}
      >
        Share
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="md"
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <ShareIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Share Conversation</h3>
                    <p className="text-sm text-default-500">
                      {session.is_public
                        ? "Public - Anyone can view"
                        : "Private - Only you can view"}
                    </p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {/* Current Status Card */}
                  <Card className="bg-default-50">
                    <CardBody className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            session.is_public
                              ? "bg-success/20 text-success"
                              : "bg-default/20 text-default-600"
                          }`}
                        >
                          {session.is_public ? (
                            <GlobeAltIcon className="h-4 w-4" />
                          ) : (
                            <LockClosedIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {session.is_public ? "Public" : "Private"}
                            </span>
                            <Chip
                              size="sm"
                              variant="flat"
                              color={session.is_public ? "success" : "default"}
                            >
                              {session.is_public ? "Shared" : "Personal"}
                            </Chip>
                          </div>
                          <p className="text-sm text-default-500">
                            {session.is_public
                              ? "Anyone with the link can view this conversation"
                              : "Only you can view this conversation"}
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Share Link Section (if public) */}
                  {session.is_public && shareUrl && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-default-700">Share link</label>
                      <div className="flex gap-2">
                        <Input
                          value={shareUrl}
                          isReadOnly
                          variant="bordered"
                          className="flex-1"
                          size="sm"
                        />
                        <Button
                          onPress={handleCopyLink}
                          color={isCopied ? "success" : "primary"}
                          variant={isCopied ? "flat" : "solid"}
                          size="sm"
                          isIconOnly
                        >
                          {isCopied ? (
                            <CheckIcon className="h-4 w-4" />
                          ) : (
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Card className="border border-primary/20 bg-primary/5">
                        <CardBody className="px-3 py-2">
                          <p className="text-xs text-default-600">
                            💡 Anyone with this link can view the conversation, even without an
                            account.
                          </p>
                        </CardBody>
                      </Card>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                {session.is_public ? (
                  <Button
                    color="default"
                    variant="flat"
                    onPress={handleMakePrivate}
                    isLoading={isSharing}
                    startContent={!isSharing && <LockClosedIcon className="h-4 w-4" />}
                  >
                    {isSharing ? "Making Private..." : "Make Private"}
                  </Button>
                ) : (
                  <Button
                    color="primary"
                    onPress={handleMakePublic}
                    isLoading={isSharing}
                    startContent={!isSharing && <GlobeAltIcon className="h-4 w-4" />}
                  >
                    {isSharing ? "Making Public..." : "Make Public"}
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
