import { Provider, type ModelConfig } from "@/config/models";
import { type MessagePart, type ReasoningDetail } from "@/services";
import { convertPartsForDb } from "@/utils/database-message-converter";
import {
  ToolResultPart,
  type Attachment,
  type CoreMessage,
  type FilePart,
  type ImagePart,
  type Message,
  type TextPart,
  type ToolCallPart,
} from "ai";

interface ClientAttachment extends Attachment {
  path?: string;
  size?: number;
  filename?: string;
}

export interface CustomFileUIPart {
  type: "file";
  url: string;
  mimeType: string;
  filename?: string;
  path?: string;
}

interface CustomReasoningUIPart {
  type: "reasoning";
  reasoning: string;
  details?: ReasoningDetail[];
}

interface AssistantReasoningPart {
  type: "reasoning";
  text: string;
  signature?: string;
}

type UserContentPart = TextPart | ImagePart | FilePart;
type AssistantContentPart = TextPart | FilePart | ToolCallPart | AssistantReasoningPart;

// PROVIDER CONFIGURATION - Add providers here that need assistant images converted to user messages
const PROVIDERS_NEEDING_IMAGE_CONVERSION = new Set<Provider>(["OpenAI", "Anthropic"]);

// Generic helper functions for providers that need assistant images converted to user messages
const needsImageConversion = (modelConfig: ModelConfig) =>
  PROVIDERS_NEEDING_IMAGE_CONVERSION.has(modelConfig.provider);

const shouldSkipImageFromAssistant = (modelConfig: ModelConfig, mimeType: string) =>
  needsImageConversion(modelConfig) && mimeType.startsWith("image/");

const createUserImageMessage = async (
  message: Message,
  modelConfig: ModelConfig
): Promise<CoreMessage | null> => {
  if (!needsImageConversion(modelConfig)) return null;

  const messageParts = message.parts;

  const imageParts: UserContentPart[] = [];

  // Handle image parts from message parts
  if (messageParts?.length) {
    for (const part of messageParts) {
      if (part.type === "file") {
        const filePart = part as unknown as CustomFileUIPart;
        if (filePart.url && filePart.mimeType?.startsWith("image/")) {
          const { corePart } = await processAttachment(
            filePart.url,
            filePart.mimeType,
            modelConfig,
            false
          );
          if (corePart) imageParts.push(corePart as UserContentPart);
        }
      }
    }
  }

  // Just return the images without any special explanation text
  if (imageParts.length > 0) {
    return { role: "user", content: imageParts };
  }

  return null;
};

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
  const coreParts: UserContentPart[] = [];

  // Use the helper to properly convert message parts to database format )
  const dbParts = convertPartsForDb(message);

  // Build coreParts for the AI model (different from database storage)
  const textContent = typeof message.content === "string" ? message.content.trim() : "";
  if (textContent) {
    coreParts.push({ type: "text", text: textContent });
  }

  for (const att of attachments) {
    if (!att.contentType || !att.url) continue;

    const { corePart } = await processAttachment(att.url, att.contentType, modelConfig, false);
    if (corePart) coreParts.push(corePart as UserContentPart);
  }

  const coreMessage = coreParts.length > 0 ? { role: "user" as const, content: coreParts } : null;
  return { coreMessage, dbParts };
}

async function processAssistantMessage(
  message: Message,
  modelConfig: ModelConfig
): Promise<CoreMessage[]> {
  const textParts: TextPart[] = [];
  const fileParts: FilePart[] = [];
  const reasoningParts: AssistantReasoningPart[] = [];
  const completedToolInvocations: { call: ToolCallPart; result: ToolResultPart }[] = [];

  const messageParts = message.parts ?? [];

  if (messageParts.length === 0 && typeof message.content === "string" && message.content.trim()) {
    textParts.push({ type: "text", text: message.content.trim() });
  }

  for (const part of messageParts) {
    switch (part.type) {
      case "text":
        if ("text" in part && part.text) {
          textParts.push({ type: "text", text: part.text });
        }
        break;

      case "file": {
        const filePart = part as unknown as CustomFileUIPart;
        if (filePart.url && filePart.mimeType) {
          if (shouldSkipImageFromAssistant(modelConfig, filePart.mimeType)) {
            continue;
          }
          const { corePart } = await processAttachment(
            filePart.url,
            filePart.mimeType,
            modelConfig,
            true
          );
          if (corePart?.type === "file") fileParts.push(corePart);
        }
        break;
      }

      case "tool-invocation": {
        type ToolInvocationWithMessage = {
          toolInvocation: {
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result?: unknown;
          };
        };
        const { toolInvocation } = part as ToolInvocationWithMessage;
        const { toolCallId, toolName, args, result } = toolInvocation;

        // Only process tool invocations that have a result. This prevents
        // incomplete tool calls from cancelled streams from being sent to the API.
        if (toolCallId && toolName && result !== undefined) {
          completedToolInvocations.push({
            call: { type: "tool-call", toolCallId, toolName, args },
            result: { type: "tool-result", toolCallId, toolName, result },
          });
        }
        break;
      }

      case "reasoning": {
        const reasoningPart = part as unknown as CustomReasoningUIPart;
        if (reasoningPart.reasoning) {
          const signature = reasoningPart.details?.[0]?.signature;
          if (
            modelConfig.provider === "Anthropic" &&
            modelConfig.capabilities.includes("reasoning") &&
            signature
          ) {
            reasoningParts.push({
              type: "reasoning",
              text: reasoningPart.reasoning,
              signature: signature,
            });
          } else {
            reasoningParts.push({ type: "reasoning", text: reasoningPart.reasoning });
          }
        }
        break;
      }
      default:
        break;
    }
  }

  const allMessages: CoreMessage[] = [];

  // If there were any completed tool calls, structure them correctly.
  if (completedToolInvocations.length > 0) {
    const toolCallParts = completedToolInvocations.map((inv) => inv.call);
    const toolResultParts = completedToolInvocations.map((inv) => inv.result);

    // 1. Assistant message with only tool calls
    allMessages.push({ role: "assistant", content: toolCallParts });

    // 2. Tool message with all corresponding results
    allMessages.push({ role: "tool", content: toolResultParts });
  }

  // 3. Final assistant message with any text/file/reasoning content.
  // This message comes *after* the tool results.
  const finalAssistantParts: (TextPart | FilePart | AssistantReasoningPart)[] = [
    ...textParts,
    ...fileParts,
    ...reasoningParts,
  ];

  if (finalAssistantParts.length > 0) {
    // Simplify to a string if it's just a single text part
    const firstPart = finalAssistantParts[0];
    if (finalAssistantParts.length === 1 && firstPart?.type === "text") {
      allMessages.push({ role: "assistant", content: firstPart.text });
    } else {
      allMessages.push({
        role: "assistant",
        content: finalAssistantParts,
      });
    }
  }

  return allMessages;
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
        const coreMessagesFromAssistant = await processAssistantMessage(message, modelConfig);
        const userImageMessage = await createUserImageMessage(message, modelConfig);

        if (coreMessagesFromAssistant.length > 0) {
          coreMessages.push(...coreMessagesFromAssistant);
        }

        // The user image message (if any) should come after all assistant and tool messages
        if (userImageMessage) {
          coreMessages.push(userImageMessage);
        }
        break;
      }
      default:
        coreMessages.push(message as CoreMessage);
        break;
    }
  }

  return { coreMessages, userMessageToSave };
};
