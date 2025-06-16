import { type ReasoningLevel } from "@/config/models";
import { type ChatMessage, type MessagePart } from "@/services/chat-messages";
import { type ProviderMetadata } from "@/types/provider-metadata";
import { type Json } from "@/types/supabase-types";
import { type JSONValue, type Message } from "ai";
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
 * Converts AI SDK message parts to the database-compatible format.
 *
 * This function transforms the parts from AI SDK messages (which may include
 * file attachments with specific URL structures) into the standardized format
 * expected by our database schema. It:
 * - Preserves existing parts to avoid duplicates during partial saves
 * - Extracts text content and creates text parts
 * - Transforms file parts to match database schema expectations
 * - Handles deduplication based on file URLs and text content
 *
 * @param message - The AI SDK message to convert
 * @param existingParts - Existing parts to preserve (used for partial message updates)
 * @returns Array of MessagePart objects ready for database storage
 */
function convertPartsForDb(message: Message, existingParts: MessagePart[] = []): MessagePart[] {
  const parts: MessagePart[] = [...existingParts];
  const textContent = typeof message.content === "string" ? message.content.trim() : "";

  // Add text part if it exists and is not already present
  if (textContent && !parts.some((p) => p.type === "text")) {
    parts.push({ type: "text", text: textContent });
  }

  // Process and add file parts, avoiding duplicates
  if (message.parts?.length) {
    for (const part of message.parts) {
      if (part.type === "file" && "url" in part) {
        const filePart = part as unknown as {
          url: string;
          mimeType: string;
          filename?: string;
          path?: string;
          size?: number;
        };
        if (!parts.some((p) => p.file?.url === filePart.url)) {
          parts.push({
            type: "file",
            file: {
              name: filePart.filename || "file",
              path: filePart.path || "",
              url: filePart.url,
              size: filePart.size ?? 0,
              mimeType: filePart.mimeType,
            },
          });
        }
      }
    }
  }

  return parts;
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
  /** Existing parts to preserve (used for partial message saves during streaming) */
  existingParts?: MessagePart[];
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
    existingParts,
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
  const dbParts = convertPartsForDb(message, existingParts);

  // Create the final database-ready message object
  const preparedMessage: Omit<ChatMessage, "created_at"> = {
    id: message.id || uuidv4(),
    session_id: sessionId,
    user_id: userId,
    // The AI SDK `Message` role type is broader than our DB type.
    // We cast here, assuming the calling context provides a valid role.
    role: message.role as ChatMessage["role"],
    parts: dbParts,
    model_used: model || null,
    model_provider: modelProvider || null,
    model_config: modelConfig,
    metadata: dbMetadata as Json,
  };

  return preparedMessage;
}
