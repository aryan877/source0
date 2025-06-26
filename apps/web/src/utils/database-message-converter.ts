import { type ReasoningLevel, getModelById } from "@/config/models";
import { type ChatMessage, type MessagePart, type ReasoningDetail } from "@/services/chat-messages";
import { type ProviderMetadata } from "@/types/provider-metadata";
import { type Json } from "@/types/supabase-types";
import { type CoreMessage, type JSONValue, type Message } from "ai";
import { v4 as uuidv4 } from "uuid";

/**
 * Converts database chat messages to AI SDK `Message` objects for the UI.
 *
 * This function transforms the structured database format (with separate parts array)
 * into the format expected by the AI SDK's useChat hook. It:
 * - Creates a simple string for the `content` field (used by models and fallbacks).
 * - Preserves the full structured `parts` data for rich UI rendering.
 * - Bundles model and grounding data into a single `message_complete` annotation
 *   for simplified frontend processing.
 *
 * @param dbMessages - Array of messages from the database
 * @returns Array of AI SDK Message objects ready for UI consumption
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
        if (part.type === "tool-invocation" && part.toolInvocation) {
          return {
            type: "tool-invocation",
            toolInvocation: part.toolInvocation,
          };
        }
        if (part.type === "reasoning" && part.reasoning) {
          return {
            type: "reasoning",
            reasoning: part.reasoning,
            details: part.details,
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

    // Build a single comprehensive annotation from DB data
    const messageCompleteData: {
      modelUsed: string | null;
      modelProvider: string | null;
      grounding?: JSONValue;
      hasGrounding?: boolean;
    } = {
      modelUsed: msg.model_used,
      modelProvider: msg.model_provider,
    };

    if (
      msg.metadata &&
      typeof msg.metadata === "object" &&
      "grounding" in msg.metadata &&
      msg.metadata.grounding
    ) {
      messageCompleteData.grounding = msg.metadata.grounding as JSONValue;
      messageCompleteData.hasGrounding = true;
    }

    const annotations: JSONValue[] = [
      {
        type: "message_complete",
        data: messageCompleteData,
      },
    ];

    return {
      id: msg.id,
      role: msg.role as Message["role"],
      content,
      parts: parts as Message["parts"], // Pass the fully constructed parts array.
      createdAt: new Date(msg.created_at),
      annotations,
    };
  });
}

/**
 * Extracts and processes grounding metadata from provider-specific metadata.
 *
 * This function specifically handles Google's grounding metadata format and logs
 * useful debugging information in development mode. Grounding data includes
 * web search queries, content chunks, and supporting evidence.
 *
 * @param providerMetadata - Provider-specific metadata that may contain grounding info
 * @returns The grounding metadata as JSONValue, or null if not available
 */
function getGroundingMetadata(providerMetadata: ProviderMetadata | undefined): JSONValue | null {
  if (providerMetadata?.google?.groundingMetadata) {
    const grounding = providerMetadata.google.groundingMetadata;
    if (process.env.NODE_ENV === "development") {
      console.log("Grounding Metadata:", {
        queries: grounding.webSearchQueries?.length ?? 0,
        chunks: grounding.groundingChunks?.length ?? 0,
        supports: grounding.groundingSupports?.length ?? 0,
      });
    }
    return grounding as JSONValue;
  }
  return null;
}

/**
 * Converts AI SDK message parts into a database-compatible format.
 * This handles deduplication of text and file parts.
 *
 * @param message - The AI SDK message to convert
 * @returns Array of MessagePart objects ready for database storage
 */
export function convertPartsForDb(message: Message): MessagePart[] {
  const dbParts: MessagePart[] = [];
  const existingText = new Set<string>();
  const existingFileUrls = new Set<string>();
  const existingToolCallIds = new Set<string>();
  const existingReasoning = new Set<string>();

  if (!message.parts || message.parts.length === 0) {
    const textContent = typeof message.content === "string" ? message.content.trim() : "";
    if (textContent) {
      dbParts.push({ type: "text", text: textContent });
    }
    return dbParts;
  }

  for (const part of message.parts) {
    switch (part.type) {
      case "text": {
        if ("text" in part && part.text && !existingText.has(part.text)) {
          dbParts.push({ type: "text", text: part.text });
          existingText.add(part.text);
        }
        break;
      }
      case "file": {
        if ("url" in part) {
          const filePart = part as unknown as {
            url: string;
            mimeType: string;
            filename?: string;
            path?: string;
            size?: number;
          };
          if (!existingFileUrls.has(filePart.url)) {
            dbParts.push({
              type: "file",
              file: {
                name: filePart.filename || "file",
                path: filePart.path || "",
                url: filePart.url,
                size: filePart.size ?? 0,
                mimeType: filePart.mimeType,
              },
            });
            existingFileUrls.add(filePart.url);
          }
        }
        break;
      }
      case "tool-invocation": {
        if ("toolInvocation" in part) {
          const toolPart = part as unknown as { toolInvocation: Record<string, unknown> };
          const toolCallId = toolPart.toolInvocation.toolCallId as string;
          if (toolCallId && !existingToolCallIds.has(toolCallId)) {
            dbParts.push({
              type: "tool-invocation",
              toolInvocation: toolPart.toolInvocation,
            });
            existingToolCallIds.add(toolCallId);
          }
        }
        break;
      }
      case "reasoning": {
        if ("reasoning" in part) {
          const reasoningPart = part as unknown as {
            reasoning: string;
            details: ReasoningDetail[];
          };
          if (reasoningPart.reasoning && !existingReasoning.has(reasoningPart.reasoning)) {
            dbParts.push({
              type: "reasoning",
              reasoning: reasoningPart.reasoning,
              details: reasoningPart.details,
            });
            existingReasoning.add(reasoningPart.reasoning);
          }
        }
        break;
      }
    }
  }

  return dbParts;
}

/**
 * Configuration options for preparing a message for database insertion.
 * This interface centralizes all the data needed to create a complete ChatMessage record.
 */
interface PrepareMessageOptions {
  /** The AI SDK message to convert */
  message: Message;
  /** The chat session ID this message belongs to */
  sessionId: string;
  /** The user ID who sent/received this message */
  userId: string;
  /** The model used to generate this message (for assistant messages) */
  model?: string;
  /** The provider of the model (e.g., "google", "openai") */
  modelProvider?: string;
  /** The reasoning level used for this message */
  reasoningLevel?: ReasoningLevel;
  /** Whether search was enabled for this message */
  searchEnabled?: boolean;
  /** Provider-specific metadata (usage stats, grounding data, etc.) */
  providerMetadata?: ProviderMetadata;
  /** Whether this is the first message in a new session (affects title generation) */
  isFirstMessage?: boolean;
}

/**
 * Prepares a message object for database insertion.
 *
 * This is the main function that centralizes all logic for converting AI SDK messages
 * into the database format. It handles:
 * - Converting message parts to database schema
 * - Extracting and processing grounding metadata
 * - Building model configuration objects
 * - Creating comprehensive metadata objects
 * - Ensuring proper type safety for database insertion
 *
 * The returned object is ready to be inserted into the chat_messages table,
 * except for the created_at timestamp which is handled by the database.
 *
 * @param options - All the data needed to prepare the message
 * @returns A ChatMessage object ready for database insertion (minus created_at)
 */
export function prepareMessageForDb(
  options: PrepareMessageOptions
): Omit<ChatMessage, "created_at"> {
  const {
    message,
    sessionId,
    userId,
    model,
    modelProvider,
    reasoningLevel,
    searchEnabled,
    providerMetadata,
  } = options;

  // Extract grounding data from provider metadata if available
  const groundingData = getGroundingMetadata(providerMetadata);

  // Build model configuration object (only include defined values)
  const modelConfig: { reasoningLevel?: ReasoningLevel; searchEnabled?: boolean } = {};
  if (reasoningLevel) {
    modelConfig.reasoningLevel = reasoningLevel;
  }
  if (searchEnabled !== undefined) {
    modelConfig.searchEnabled = searchEnabled;
  }

  // Build comprehensive metadata object for database storage
  const dbMetadata: { usage?: unknown; grounding?: JSONValue } = {};
  if (providerMetadata?.usage) {
    dbMetadata.usage = providerMetadata.usage;
  }
  if (groundingData) {
    dbMetadata.grounding = groundingData;
  }

  // Convert message parts to database format
  const dbParts = convertPartsForDb(message);

  let finalModelName = model || null;
  if (model && reasoningLevel) {
    const modelConfig = getModelById(model);
    if (modelConfig?.reasoningLevels && modelConfig.reasoningLevels.length > 0) {
      finalModelName = `${model} (${reasoningLevel})`;
    }
  }

  // Create the final database-ready message object
  const preparedMessage: Omit<ChatMessage, "created_at"> = {
    id: message.id || uuidv4(),
    session_id: sessionId,
    user_id: userId,
    // The AI SDK `Message` role type is broader than our DB type.
    // We cast here, assuming the calling context provides a valid role.
    role: message.role as ChatMessage["role"],
    parts: dbParts,
    model_used: finalModelName,
    model_provider: modelProvider || null,
    model_config: modelConfig,
    metadata: dbMetadata as Json,
  };

  return preparedMessage;
}

/**
 * Ensures that a list of messages contains no duplicate IDs.
 * If duplicates are found, it keeps the last occurrence of the message.
 * This is useful for preventing React key errors when message lists are updated.
 *
 * @param messages - An array of AI SDK Message objects.
 * @returns A new array of Message objects with unique IDs.
 */
export const ensureUniqueMessages = (messages: Message[]): Message[] => {
  const uniqueMessages = messages.reduce((acc: Message[], message) => {
    const existingIndex = acc.findIndex((m) => m.id === message.id);
    if (existingIndex === -1) {
      acc.push(message);
    } else {
      // If duplicate ID found, keep the more recent one (later in array)
      console.warn(`Duplicate message ID detected: ${message.id}, keeping latest version`);
      acc[existingIndex] = message;
    }
    return acc;
  }, []);
  return uniqueMessages;
};

/**
 * Builds a comprehensive assistant message from the raw `CoreMessage` array returned by the AI SDK.
 *
 * This function processes the response from `streamText`, which can contain separate
 * messages for text, tool calls, and tool results. It consolidates them into a
 * single, structured AI SDK `Message` object with all parts correctly assembled.
 *
 * @param responseMessages - The array of `CoreMessage` objects from the `onFinish` callback.
 * @param messageId - The unique ID to assign to the new assistant message.
 * @returns A single, consolidated `Message` object for the assistant's turn.
 */
export function buildAssistantMessageFromResponse(
  responseMessages: CoreMessage[],
  messageId: string
): Message {
  const parts: Message["parts"] = [];
  let fullContent = "";
  let stepCount = 0;

  for (const message of responseMessages) {
    if (message.role === "assistant" && Array.isArray(message.content)) {
      for (const contentPart of message.content) {
        if (contentPart.type === "text") {
          parts.push({ type: "text", text: String(contentPart.text) });
          fullContent += String(contentPart.text);
        } else if (contentPart.type === "tool-call") {
          // Find tool result for this tool call by looking in the tool messages
          let toolResult: unknown;
          let resultFound = false;
          for (const toolMessage of responseMessages) {
            if (toolMessage.role === "tool" && Array.isArray(toolMessage.content)) {
              for (const toolPart of toolMessage.content) {
                if (
                  toolPart.type === "tool-result" &&
                  toolPart.toolCallId === contentPart.toolCallId
                ) {
                  toolResult = toolPart.result;
                  resultFound = true;
                  break;
                }
              }
            }
            if (resultFound) break;
          }

          const toolInvocation = {
            state: "result" as const,
            step: stepCount,
            toolCallId: contentPart.toolCallId,
            toolName: contentPart.toolName,
            args: contentPart.args,
            result: toolResult,
          };

          parts.push({
            type: "tool-invocation",
            toolInvocation,
          });
          stepCount++;
        } else if (contentPart.type === "reasoning") {
          const reasoningContentPart = contentPart as {
            text: string;
            signature?: string;
          };
          parts.push({
            type: "reasoning",
            reasoning: reasoningContentPart.text,
            details: [
              {
                type: "text",
                text: String(reasoningContentPart.text),
                signature: reasoningContentPart.signature,
              },
            ],
          });
        }
      }
    }
  }

  const assistantMessage: Message = {
    id: messageId,
    role: "assistant" as const,
    content: fullContent,
    parts,
  };

  return assistantMessage;
}
