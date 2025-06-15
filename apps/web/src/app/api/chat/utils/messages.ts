import { type ModelConfig } from "@/config/models";
import { type MessagePart } from "@/utils/supabase/db";
import {
  type Attachment,
  type CoreMessage,
  type FilePart,
  type ImagePart,
  type Message,
  type TextPart,
} from "ai";

interface ClientAttachment extends Attachment {
  path?: string;
  size?: number;
}

type UserContentPart = TextPart | ImagePart | FilePart;
type AssistantContentPart = TextPart | FilePart; // Assistants might have other parts like tool calls

async function processAttachment(
  url: string,
  mimeType: string,
  modelConfig: ModelConfig,
  isAssistant: boolean
): Promise<{
  corePart: UserContentPart | AssistantContentPart | null;
}> {
  try {
    const response = await fetch(url);
    if (!response.ok) return { corePart: null };

    const buffer = Buffer.from(await response.arrayBuffer());

    if (mimeType.startsWith("image/")) {
      return {
        corePart: isAssistant
          ? { type: "file", data: buffer, mimeType }
          : { type: "image", image: buffer },
      };
    }

    if (
      (modelConfig.capabilities.includes("pdf") && mimeType === "application/pdf") ||
      (isAssistant && (mimeType.startsWith("text/") || mimeType.startsWith("application/")))
    ) {
      return { corePart: { type: "file", data: buffer, mimeType } };
    }
  } catch (e) {
    console.error(`Failed to process attachment: ${url}`, e);
  }
  return { corePart: null };
}

async function processUserMessage(
  message: Message,
  modelConfig: ModelConfig
): Promise<{
  coreMessage: CoreMessage | null;
  dbParts: MessagePart[];
}> {
  const attachments = (message.experimental_attachments as ClientAttachment[]) ?? [];
  const dbParts: MessagePart[] = [];
  const coreParts: UserContentPart[] = [];

  const textContent = typeof message.content === "string" ? message.content.trim() : "";
  if (textContent) {
    dbParts.push({ type: "text", text: textContent });
    coreParts.push({ type: "text", text: textContent });
  }

  for (const att of attachments) {
    if (!att.contentType || !att.url) continue;

    dbParts.push({
      type: "file",
      file: {
        name: att.name ?? "file",
        mimeType: att.contentType,
        url: att.url,
        path: att.path ?? "",
        size: att.size ?? 0,
      },
    });

    const { corePart } = await processAttachment(att.url, att.contentType, modelConfig, false);
    if (corePart) coreParts.push(corePart as UserContentPart);
  }

  const coreMessage = coreParts.length > 0 ? { role: "user" as const, content: coreParts } : null;
  return { coreMessage, dbParts };
}

async function processAssistantMessage(
  message: Message,
  modelConfig: ModelConfig
): Promise<CoreMessage | null> {
  const attachments = (message.experimental_attachments as ClientAttachment[]) ?? [];
  const coreParts: AssistantContentPart[] = [];

  const textContent = typeof message.content === "string" ? message.content.trim() : "";
  if (textContent) coreParts.push({ type: "text", text: textContent });

  const messageParts = (message as any).parts as Array<{
    type: string;
    text?: string;
    mimeType?: string;
    url?: string;
  }>;

  if (messageParts?.length) {
    for (const part of messageParts) {
      if (part.type === "text" && part.text) {
        if (!coreParts.some((p) => p.type === "text" && p.text === part.text)) {
          coreParts.push({ type: "text", text: part.text });
        }
      } else if (part.url && part.mimeType) {
        const { corePart } = await processAttachment(part.url, part.mimeType, modelConfig, true);
        if (corePart) coreParts.push(corePart as AssistantContentPart);
      }
    }
  }

  for (const att of attachments) {
    if (!att.contentType || !att.url) continue;
    const { corePart } = await processAttachment(att.url, att.contentType, modelConfig, true);
    if (corePart) coreParts.push(corePart as AssistantContentPart);
  }

  if (coreParts.length === 0) return null;
  const firstPart = coreParts[0];
  if (coreParts.length === 1 && firstPart?.type === "text") {
    return { role: "assistant", content: firstPart.text };
  }
  return { role: "assistant", content: coreParts };
}

export const processMessages = async (
  messages: Message[],
  modelConfig: ModelConfig
): Promise<{
  coreMessages: CoreMessage[];
  userMessageToSave: (Message & { dbParts: MessagePart[] }) | null;
}> => {
  const coreMessages: CoreMessage[] = [];
  let userMessageToSave: (Message & { dbParts: MessagePart[] }) | null = null;

  const reversedMessages = [...messages].reverse();
  const lastUserMessageIndex = reversedMessages.findIndex((m) => m.role === "user");

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (!message) continue;

    const isLastUserMessage = i === messages.length - 1 - lastUserMessageIndex;

    switch (message.role) {
      case "user": {
        const { coreMessage, dbParts } = await processUserMessage(message, modelConfig);
        if (coreMessage) coreMessages.push(coreMessage);
        if (isLastUserMessage && dbParts.length > 0) {
          userMessageToSave = { ...message, dbParts };
        }
        break;
      }
      case "assistant": {
        const coreMessage = await processAssistantMessage(message, modelConfig);
        if (coreMessage) coreMessages.push(coreMessage);
        break;
      }
      default:
        coreMessages.push(message as CoreMessage);
        break;
    }
  }

  return { coreMessages, userMessageToSave };
};
