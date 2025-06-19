import { type ReasoningLevel, getModelById } from "@/config/models";
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
    /*
     * STEP 1: INPUT - Database Row Structure
     * ====================================
     * Starting with a database row like:
     * {
     *   id: "msg_123",
     *   role: "assistant",
     *   parts: [
     *     { type: "text", text: "Hello there!" },
     *     { type: "file", file: { name: "doc.pdf", url: "...", mimeType: "application/pdf" } }
     *   ],
     *   model_used: "gpt-4o",
     *   model_provider: "openai",
     *   metadata: {
     *     usage: { promptTokens: 15, completionTokens: 12 },
     *     grounding: { webSearchQueries: ["weather Paris"], groundingChunks: [...] }
     *   },
     *   created_at: "2024-01-15T10:30:00Z"
     * }
     */

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

    /*
     * STEP 2: PARTS TRANSFORMATION
     * ============================
     * Database parts → AI SDK parts:
     *
     * FROM (database format):
     * [
     *   { type: "text", text: "Hello there!" },
     *   {
     *     type: "file",
     *     file: {
     *       name: "doc.pdf",
     *       url: "https://storage.../doc.pdf",
     *       mimeType: "application/pdf",
     *       path: "uploads/user123/doc.pdf",
     *       size: 12345
     *     }
     *   }
     * ]
     *
     * TO (AI SDK format):
     * [
     *   { type: "text", text: "Hello there!" },
     *   {
     *     type: "file",
     *     url: "https://storage.../doc.pdf",
     *     mimeType: "application/pdf",
     *     filename: "doc.pdf",
     *     path: "uploads/user123/doc.pdf"
     *   }
     * ]
     */

    // Find the text content for the top-level `content` property.
    // The SDK uses this for display fallbacks and for models that only accept text.
    const textContent = msg.parts.find((part) => part.type === "text")?.text?.trim() ?? "";

    // If there's no text but there are files, provide a placeholder.
    const content = textContent || (parts.some((p) => p?.type === "file") ? "[Attachment]" : "");

    /*
     * STEP 3: CONTENT EXTRACTION
     * ==========================
     * Extract simple string content for AI SDK compatibility:
     *
     * Database parts → Simple content string:
     * [{ type: "text", text: "Hello there!" }, { type: "file", ... }]
     * → content: "Hello there!"
     *
     * OR if no text:
     * [{ type: "file", ... }]
     * → content: "[Attachment]"
     */

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

    /*
     * STEP 4: METADATA → ANNOTATIONS TRANSFORMATION
     * ==============================================
     * Extract grounding data from database metadata and bundle with model info:
     *
     * FROM (database metadata):
     * {
     *   usage: { promptTokens: 15, completionTokens: 12 },
     *   grounding: {
     *     webSearchQueries: ["weather Paris"],
     *     groundingChunks: [
     *       { title: "Weather in Paris", url: "weather.com", snippet: "22°C sunny" }
     *     ]
     *   }
     * }
     *
     * TO (AI SDK annotation):
     * {
     *   type: "message_complete",
     *   data: {
     *     modelUsed: "gpt-4o",
     *     modelProvider: "openai",
     *     grounding: {
     *       webSearchQueries: ["weather Paris"],
     *       groundingChunks: [...]
     *     },
     *     hasGrounding: true
     *   }
     * }
     */

    const annotations: JSONValue[] = [
      {
        type: "message_complete",
        data: messageCompleteData,
      },
    ];

    /*
     * STEP 5: FINAL AI SDK MESSAGE
     * ============================
     * Combine all transformed data into AI SDK Message format:
     */
    return {
      id: msg.id,
      role: msg.role as Message["role"],
      content,
      parts: parts as Message["parts"], // Pass the fully constructed parts array.
      createdAt: new Date(msg.created_at),
      annotations,
    };

    /*
     * FINAL OUTPUT: AI SDK Message
     * ============================
     * {
     *   id: "msg_123",
     *   role: "assistant",
     *   content: "Hello there!",
     *   parts: [
     *     { type: "text", text: "Hello there!" },
     *     { type: "file", url: "...", filename: "doc.pdf", ... }
     *   ],
     *   createdAt: Date("2024-01-15T10:30:00Z"),
     *   annotations: [
     *     {
     *       type: "message_complete",
     *       data: {
     *         modelUsed: "gpt-4o",
     *         modelProvider: "openai",
     *         grounding: { webSearchQueries: [...], groundingChunks: [...] },
     *         hasGrounding: true
     *       }
     *     }
     *   ]
     * }
     *
     * This format is consumed by:
     * - useChat hook for message state
     * - message-bubble.tsx for rendering
     * - Frontend components for model badges and grounding UI
     */
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
export function convertPartsForDb(
  message: Message,
  existingParts: MessagePart[] = []
): MessagePart[] {
  const dbParts: MessagePart[] = [...existingParts];
  const existingText = new Set(existingParts.filter((p) => p.type === "text").map((p) => p.text));
  const existingFileUrls = new Set(
    existingParts.map((p) => p.file?.url).filter((url): url is string => !!url)
  );
  const existingToolCallIds = new Set(
    existingParts.map((p) => p.toolInvocation?.toolCallId as string).filter(Boolean)
  );
  const existingReasoning = new Set(
    existingParts.filter((p) => p.type === "reasoning").map((p) => p.reasoning)
  );

  if (!message.parts || message.parts.length === 0) {
    const textContent = typeof message.content === "string" ? message.content.trim() : "";
    if (textContent && !existingText.has(textContent)) {
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
            details: Array<{ type: "text"; text: string; signature?: string }>;
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

  /*
   * STEP 1: INPUT - All the pieces we need to assemble
   * ==================================================
   *
   * message (AI SDK Message): {
   *   id: "msg_789",
   *   role: "assistant",
   *   content: "Based on recent search results, it's 22°C in Paris.",
   *   parts: [{ type: "text", text: "Based on recent search results, it's 22°C in Paris." }]
   * }
   *
   * sessionId: "sess_abc123"
   * userId: "user_def456"
   * model: "gemini-1.5-pro"
   * modelProvider: "google"
   * reasoningLevel: "normal"
   * searchEnabled: true
   *
   * providerMetadata: {
   *   usage: { promptTokens: 50, completionTokens: 25 },
   *   google: {
   *     groundingMetadata: {
   *       webSearchQueries: ["Paris weather today"],
   *       groundingChunks: [
   *         { title: "Weather in Paris", url: "weather.com", snippet: "22°C sunny" }
   *       ]
   *     }
   *   }
   * }
   */

  // Extract grounding data from provider metadata if available
  const groundingData = getGroundingMetadata(providerMetadata);

  /*
   * STEP 2: GROUNDING METADATA EXTRACTION
   * =====================================
   * Extract Google-specific grounding data:
   *
   * FROM providerMetadata.google.groundingMetadata:
   * {
   *   webSearchQueries: ["Paris weather today"],
   *   groundingChunks: [
   *     { title: "Weather in Paris", url: "weather.com", snippet: "22°C sunny" }
   *   ]
   * }
   *
   * TO groundingData (JSONValue):
   * {
   *   webSearchQueries: ["Paris weather today"],
   *   groundingChunks: [
   *     { title: "Weather in Paris", url: "weather.com", snippet: "22°C sunny" }
   *   ]
   * }
   */

  // Build model configuration object (only include defined values)
  const modelConfig: { reasoningLevel?: ReasoningLevel; searchEnabled?: boolean } = {};
  if (reasoningLevel) {
    modelConfig.reasoningLevel = reasoningLevel;
  }
  if (searchEnabled !== undefined) {
    modelConfig.searchEnabled = searchEnabled;
  }

  /*
   * STEP 3: MODEL CONFIGURATION ASSEMBLY
   * ====================================
   * Build model config from defined parameters:
   *
   * Input parameters:
   * reasoningLevel: "normal"
   * searchEnabled: true
   *
   * Output modelConfig:
   * {
   *   reasoningLevel: "normal",
   *   searchEnabled: true
   * }
   */

  // Build comprehensive metadata object for database storage
  const dbMetadata: { usage?: unknown; grounding?: JSONValue } = {};
  if (providerMetadata?.usage) {
    dbMetadata.usage = providerMetadata.usage;
  }
  if (groundingData) {
    dbMetadata.grounding = groundingData;
  }

  /*
   * STEP 4: DATABASE METADATA ASSEMBLY
   * ==================================
   * Combine usage stats and grounding data:
   *
   * FROM providerMetadata.usage + groundingData:
   * usage: { promptTokens: 50, completionTokens: 25 }
   * grounding: { webSearchQueries: [...], groundingChunks: [...] }
   *
   * TO dbMetadata:
   * {
   *   usage: { promptTokens: 50, completionTokens: 25 },
   *   grounding: {
   *     webSearchQueries: ["Paris weather today"],
   *     groundingChunks: [
   *       { title: "Weather in Paris", url: "weather.com", snippet: "22°C sunny" }
   *     ]
   *   }
   * }
   */

  // Convert message parts to database format
  const dbParts = convertPartsForDb(message, existingParts);

  /*
   * STEP 5: PARTS CONVERSION
   * =======================
   * Transform AI SDK message parts → Database format using convertPartsForDb():
   *
   * Input (AI SDK parts):
   * [{ type: "text", text: "Based on recent search results, it's 22°C in Paris." }]
   *
   * Output (Database parts):
   * [{ type: "text", text: "Based on recent search results, it's 22°C in Paris." }]
   */

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

  /*
   * STEP 6: FINAL DATABASE RECORD ASSEMBLY
   * ======================================
   * Combine all transformed pieces into final database record:
   *
   * FINAL OUTPUT (ready for database insertion):
   * {
   *   id: "msg_789",
   *   session_id: "sess_abc123",
   *   user_id: "user_def456",
   *   role: "assistant",
   *   parts: [
   *     { type: "text", text: "Based on recent search results, it's 22°C in Paris." }
   *   ],
   *   model_used: "gemini-1.5-pro (normal)",
   *   model_provider: "google",
   *   model_config: {
   *     reasoningLevel: "normal",
   *     searchEnabled: true
   *   },
   *   metadata: {
   *     usage: { promptTokens: 50, completionTokens: 25 },
   *     grounding: {
   *       webSearchQueries: ["Paris weather today"],
   *       groundingChunks: [
   *         { title: "Weather in Paris", url: "weather.com", snippet: "22°C sunny" }
   *       ]
   *     }
   *   }
   * }
   *
   * This record will be inserted into the database like:
   * INSERT INTO chat_messages (
   *   id, session_id, user_id, role, parts, model_used, model_provider,
   *   model_config, metadata, created_at
   * ) VALUES (
   *   'msg_789', 'sess_abc123', 'user_def456', 'assistant',
   *   '[{"type":"text","text":"..."}]', 'gemini-1.5-pro (normal)', 'google',
   *   '{"reasoningLevel":"normal","searchEnabled":true}',
   *   '{"usage":{...},"grounding":{...}}', now()
   * );
   */

  return preparedMessage;
}
