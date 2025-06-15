import { type ChatMessage } from "@/services/chat-messages";
import { type Message } from "ai";

/**
 * Converts database chat messages to AI SDK `Message` objects for the UI.
 * It creates a simple string representation for the `content` field and
 * attaches the full, structured `parts` data to `experimental_attachments`
 * for the UI to use for rich rendering.
 */
export function convertToAiMessages(dbMessages: ChatMessage[]): Message[] {
  return dbMessages.map((msg) => {
    // Reconstruct the parts array for the AI SDK Message object.
    const parts = msg.parts
      .map((part) => {
        if (part.type === "text") {
          return { type: "text", text: part.text ?? "" };
        }
        if (part.type === "file" && part.file) {
          const file = part.file;
          // This structure matches what `message-bubble.tsx` expects for a file part.
          return {
            type: "file",
            url: file.url,
            mimeType: file.mimeType,
            filename: file.name,
            path: file.path,
          };
        }
        return null;
      })
      .filter(Boolean);

    // Find the text content for the top-level `content` property.
    // The SDK uses this for display fallbacks and for models that only accept text.
    const textContent = msg.parts.find((part) => part.type === "text")?.text?.trim() ?? "";

    // If there's no text but there are files, provide a placeholder.
    const content = textContent || (parts.some((p) => p?.type === "file") ? "[Attachment]" : "");

    return {
      id: msg.id,
      role: msg.role as Message["role"],
      content,
      parts: parts as Message["parts"], // Pass the fully constructed parts array.
      createdAt: new Date(msg.created_at),
      annotations: [
        {
          type: "model_metadata",
          data: {
            modelUsed: msg.model_used,
            modelProvider: msg.model_provider,
          },
        },
      ],
    };
  });
}
