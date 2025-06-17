import { PROVIDER_MAPPING, type ModelConfig } from "@/config/models";
import { type MessagePart } from "@/services";
import { convertPartsForDb } from "@/utils/message-utils";
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
}

interface CustomFileUIPart {
  type: "file";
  url: string;
  mimeType: string;
  filename?: string;
  path?: string;
}

type UserContentPart = TextPart | ImagePart | FilePart;
type AssistantContentPart = TextPart | FilePart | ToolCallPart; // Assistants might have other parts like tool calls
type ToolContentPart = ToolResultPart;

// PROVIDER CONFIGURATION - Add providers here that need assistant images converted to user messages
const PROVIDERS_NEEDING_IMAGE_CONVERSION = new Set<keyof typeof PROVIDER_MAPPING>([
  "OpenAI",
  "Anthropic",
]);

// Configuration for image explanation text per provider
const PROVIDER_IMAGE_EXPLANATIONS: Record<keyof typeof PROVIDER_MAPPING, string> = {
  OpenAI: "Generated image by AI assistant:",
  Anthropic: "Generated image by AI assistant:",
  Google: "Generated image by AI assistant:",
  xAI: "Generated image by AI assistant:",
  Meta: "Generated image by AI assistant:",
  DeepSeek: "Generated image by AI assistant:",
  Qwen: "Generated image by AI assistant:",
} as const;

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

  // Add explanation text at the beginning if we have images
  if (imageParts.length > 0) {
    const explanationText =
      PROVIDER_IMAGE_EXPLANATIONS[modelConfig.provider] || "Generated image by AI assistant:";
    imageParts.unshift({ type: "text", text: explanationText });
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
  const assistantCoreParts: (TextPart | FilePart | ToolCallPart)[] = [];
  const toolCoreMessages: CoreMessage[] = [];

  const messageParts = message.parts ?? [];

  // If parts are empty, fallback to message.content
  if (messageParts.length === 0 && typeof message.content === "string" && message.content.trim()) {
    assistantCoreParts.push({ type: "text", text: message.content.trim() });
  }

  // Iterate through parts in their original order
  for (const part of messageParts) {
    switch (part.type) {
      case "text":
        if ("text" in part && part.text) {
          assistantCoreParts.push({ type: "text", text: part.text });
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
          if (corePart) assistantCoreParts.push(corePart as AssistantContentPart);
        }
        break;
      }

      case "tool-invocation":
        if ("toolInvocation" in part) {
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

          if (toolCallId && toolName) {
            // 1. Add the tool_call to the assistant's message parts
            assistantCoreParts.push({
              type: "tool-call",
              toolCallId,
              toolName,
              args,
            });

            // 2. Create a separate 'tool' message for the result
            if (result !== undefined) {
              toolCoreMessages.push({
                role: "tool",
                content: [
                  {
                    type: "tool-result",
                    toolCallId,
                    toolName,
                    result,
                  },
                ] as ToolContentPart[],
              });
            }
          }
        }
        break;

      default:
        // Other part types can be handled here if needed
        break;
    }
  }

  const allMessages: CoreMessage[] = [];
  if (assistantCoreParts.length > 0) {
    const firstPart = assistantCoreParts[0];
    // Simplify to a string if it's just a single text part
    if (assistantCoreParts.length === 1 && firstPart?.type === "text") {
      allMessages.push({ role: "assistant", content: firstPart.text });
    } else {
      allMessages.push({ role: "assistant", content: assistantCoreParts });
    }
  }

  // Add all the tool result messages after the assistant's message
  allMessages.push(...toolCoreMessages);

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
        if (coreMessagesFromAssistant.length > 0) {
          coreMessages.push(...coreMessagesFromAssistant);
        }

        // For providers that need image conversion, create additional user messages for images since they can't read assistant files properly
        const userImageMessage = await createUserImageMessage(message, modelConfig);
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
