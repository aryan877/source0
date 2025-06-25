"use client";

import { useChatSessions } from "@/hooks/queries/use-chat-sessions";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Modal, ModalBody, ModalContent, ModalHeader, ScrollShadow } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  const { sessions: searchResults, isLoading, error } = useChatSessions(debouncedSearchQuery);

  useEffect(() => {
    // Clear search query when modal is closed
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelectChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" backdrop="blur">
      <ModalContent className="max-w-2xl">
        <ModalHeader className="border-b border-divider">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-foreground/60" />
            </div>
            <input
              type="text"
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-transparent bg-transparent py-2 pl-10 pr-4 text-base focus:border-transparent focus:outline-none focus:ring-0"
              autoFocus
            />
          </div>
        </ModalHeader>
        <ModalBody className="p-0">
          <ScrollShadow className="h-[400px]">
            <div className="p-4">
              {isLoading && <p>Loading...</p>}
              {error && <p className="text-danger">Error loading results</p>}
              {!isLoading && !error && searchResults.length === 0 && (
                <div className="text-center text-foreground/60">
                  {debouncedSearchQuery ? "No results found" : "Start typing to search your chats"}
                </div>
              )}
              <div className="space-y-2">
                {searchResults.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSelectChat(session.id)}
                    className="cursor-pointer rounded-lg p-3 hover:bg-content2"
                  >
                    <p className="font-medium">{session.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollShadow>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
