import { type ModelConfig } from "@/config/models";
import { type MessagePart } from "@/utils/supabase/db";
import { type Attachment, type CoreMessage, type Message } from "ai";

interface ClientAttachment extends Attachment {
  path?: string;
  size?: number;
}

export const processMessages = async (
  messages: Message[],
  modelConfig: ModelConfig
): Promise<{
  coreMessages: CoreMessage[];
  userMessageToSave: (Message & { dbParts: MessagePart[] }) | null;
}> => {
  const coreMessages: CoreMessage[] = [];
  const reversedMessages = [...messages].reverse();
  const lastUserMessageIndex = reversedMessages.findIndex((m) => m.role === "user");
  let userMessageToSave: (Message & { dbParts: MessagePart[] }) | null = null;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (!message) continue;

    const isLastUserMessage =
      message.role === "user" && i === messages.length - 1 - lastUserMessageIndex;

    if (message.role === "user") {
      const attachments = (message.experimental_attachments as ClientAttachment[]) ?? [];
      const dbParts: MessagePart[] = [];
      const coreParts: Array<
        | { type: "text"; text: string }
        | { type: "image"; image: Buffer; contentType?: string }
        | { type: "file"; data: Buffer; mimeType: string }
      > = [];

      // Text content
      const textContent = typeof message.content === "string" ? message.content.trim() : "";
      if (textContent) {
        dbParts.push({ type: "text", text: textContent });
        coreParts.push({ type: "text", text: textContent });
      }

      // Process attachments
      if (attachments.length > 0) {
        await Promise.all(
          attachments.map(async (att) => {
            if (!att.contentType || !att.url) return;

            dbParts.push({
              type: "file",
              file: {
                name: att.name ?? "file",
                mimeType: att.contentType ?? "application/octet-stream",
                url: att.url ?? "",
                path: att.path ?? "",
                size: att.size ?? 0,
              },
            });

            try {
              const response = await fetch(att.url);
              if (!response.ok) return;

              const buffer = await response.arrayBuffer();
              if (att.contentType.startsWith("image/")) {
                coreParts.push({
                  type: "image",
                  image: Buffer.from(buffer),
                  contentType: att.contentType,
                });
              } else if (
                modelConfig.capabilities.includes("pdf") &&
                att.contentType === "application/pdf"
              ) {
                coreParts.push({
                  type: "file",
                  data: Buffer.from(buffer),
                  mimeType: att.contentType,
                });
              }
            } catch (e) {
              console.error(`Failed to process attachment: ${att.url}`, e);
            }
          })
        );
      }

      if (coreParts.length > 0) {
        coreMessages.push({ role: "user", content: coreParts });
      }

      if (isLastUserMessage && dbParts.length > 0) {
        userMessageToSave = { ...message, dbParts };
      }
    } else if (message.role === "assistant") {
      // Handle assistant messages with files, reasoning, and tool calls support
      const attachments = (message.experimental_attachments as ClientAttachment[]) ?? [];
      const coreParts: Array<
        | { type: "text"; text: string }
        | { type: "file"; data: Buffer; mimeType: string }
        | { type: "tool-call"; toolCallId: string; toolName: string; args: unknown }
      > = [];

      // Text content
      const textContent = typeof message.content === "string" ? message.content.trim() : "";
      if (textContent) {
        coreParts.push({ type: "text", text: textContent });
      }

      // Process parts from the message object
      const messageParts = (message as any).parts as
        | Array<{
            type: string;
            text?: string;
            mimeType?: string;
            url?: string;
          }>
        | undefined;

      if (messageParts?.length) {
        await Promise.all(
          messageParts.map(async (part) => {
            if (part.type === "text" && part.text) {
              if (
                !coreParts.some((p) => p.type === "text" && p.text === part.text) &&
                message.content !== part.text
              ) {
                coreParts.push({ type: "text", text: part.text });
              }
            } else if (
              (part.type === "file" || part.type === "image") &&
              part.mimeType?.startsWith("image/") &&
              part.url
            ) {
              try {
                const response = await fetch(part.url);
                if (response.ok) {
                  const buffer = await response.arrayBuffer();
                  coreParts.push({
                    type: "file", // Use "file" type for images in assistant messages
                    data: Buffer.from(buffer),
                    mimeType: part.mimeType,
                  });
                }
              } catch (e) {
                console.error(`Failed to process assistant image attachment: ${part.url}`, e);
              }
            }
          })
        );
      }

      // Process file attachments (no images for assistant messages per AI SDK)
      if (attachments.length > 0) {
        await Promise.all(
          attachments.map(async (att) => {
            if (!att.contentType || !att.url) return;

            try {
              const response = await fetch(att.url);
              if (!response.ok) return;

              const buffer = await response.arrayBuffer();
              // Only process files (PDFs, documents, etc.) - no images for assistant messages
              if (
                att.contentType === "application/pdf" ||
                att.contentType.startsWith("text/") ||
                att.contentType.startsWith("application/")
              ) {
                coreParts.push({
                  type: "file",
                  data: Buffer.from(buffer),
                  mimeType: att.contentType,
                });
              }
            } catch (e) {
              console.error(`Failed to process assistant attachment: ${att.url}`, e);
            }
          })
        );
      }

      if (coreParts.length > 0) {
        if (coreParts.length === 1 && coreParts[0]?.type === "text") {
          // Simple text message
          coreMessages.push({ role: "assistant", content: coreParts[0].text });
        } else {
          // Message with files or multiple parts
          coreMessages.push({
            role: "assistant",
            content: coreParts as any,
          });
        }
      }
    } else {
      // Handle other message types (system, tool, etc.)
      coreMessages.push(message as CoreMessage);
    }
  }

  return { coreMessages, userMessageToSave };
};
