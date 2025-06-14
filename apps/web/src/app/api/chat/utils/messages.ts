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
    } else {
      coreMessages.push(message as CoreMessage);
    }
  }

  return { coreMessages, userMessageToSave };
};
