"use client";

import { useMicrophonePermission } from "@/hooks/use-microphone-permission";
import { Button } from "@heroui/react";
import { AlertCircle, Loader2, Mic, MicOff } from "lucide-react";

export interface MicButtonProps {
  isRecording: boolean;
  isProcessingSpeech: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  hasText: boolean;
}

export function MicButton({
  isRecording,
  isProcessingSpeech,
  startRecording,
  stopRecording,
  hasText,
}: MicButtonProps) {
  const micPermission = useMicrophonePermission();

  // If checking permissions
  if (micPermission === "checking") {
    return (
      <Button
        type="button"
        isIconOnly
        size="sm"
        className="h-8 w-8 text-default-500"
        disabled={true}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // If permission is denied and no text
  if (micPermission === "denied" && !hasText) {
    return (
      <Button
        type="button"
        isIconOnly
        size="sm"
        className="group relative h-8 w-8"
        onPress={() => {
          alert(
            "Microphone access is blocked. To enable voice input:\\n\\n1. Click the lock/site settings icon in your browser's address bar\\n2. Allow microphone access\\n3. Refresh this page"
          );
        }}
        title="Microphone access denied. Click for help."
      >
        <MicOff className="h-4 w-4 text-danger" />
        <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-danger opacity-0 transition-opacity group-hover:opacity-100">
          <AlertCircle className="h-2 w-2 text-white" />
        </span>
      </Button>
    );
  }

  // If there's text, show send button (handled by parent), so we render nothing
  if (hasText) {
    return null;
  }

  // If recording is in progress
  if (isRecording) {
    return (
      <Button
        type="button"
        isIconOnly
        size="sm"
        color="primary"
        className="h-8 w-8 animate-pulse"
        onPress={stopRecording}
        disabled={isProcessingSpeech}
      >
        <Mic className="h-4 w-4" />
      </Button>
    );
  }

  // Default microphone button (prompt or granted)
  return (
    <Button
      type="button"
      isIconOnly
      size="sm"
      variant="light"
      className="h-8 w-8 text-default-500"
      onPress={startRecording}
      disabled={isProcessingSpeech}
      title={isProcessingSpeech ? "Processing speech..." : "Start voice recording"}
    >
      {isProcessingSpeech ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
