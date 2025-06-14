import {
  getModelById,
  PROVIDER_MAPPING,
  type ModelConfig,
  type ReasoningLevel,
} from "@/config/models";
import { type GoogleProviderMetadata, type ProviderMetadata } from "@/types/google-metadata";
import {
  addMessage,
  createChatSession,
  getMessages,
  updateChatSessionTitle,
  type MessagePart,
} from "@/utils/supabase/db";
import { createClient } from "@/utils/supabase/server";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import {
  createDataStreamResponse,
  DataStreamWriter,
  experimental_generateImage as generateImage,
  generateText,
  streamText,
  type Attachment,
  type CoreMessage,
  type JSONValue,
  type LanguageModel,
  type Message,
} from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ChatRequest {
  messages: Message[];
  model?: string;
  reasoningLevel?: ReasoningLevel;
  searchEnabled?: boolean;
  id?: string;
}

interface ClientAttachment extends Attachment {
  path?: string;
  size?: number;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

interface ImageGenerationResponse {
  role: "assistant";
  content: string;
  parts: Array<{
    type: "text" | "file";
    text?: string;
    mimeType?: string;
    data?: string;
  }>;
}

interface ModelMappingResult {
  supported: true;
  provider: typeof google | typeof openai | typeof anthropic | typeof xai;
  model: string;
  providerInfo: {
    name: string;
    hasSearchGrounding?: boolean;
    hasReasoning?: boolean;
    supported: boolean;
  };
}

interface UnsupportedModelResult {
  supported: false;
  message: string;
}

type ModelMapping = ModelMappingResult | UnsupportedModelResult;

// ============================================================================
// UTILITIES & HELPERS
// ============================================================================

const PROVIDERS = {
  google,
  openai,
  anthropic,
  xai,
} as const;

const createTimer = (label: string) => {
  const start = Date.now();
  return { end: () => Date.now() - start };
};

const createErrorResponse = (message: string, status: number = 500, code?: string): Response => {
  return new Response(
    JSON.stringify({ error: message, ...(code && { code }) } satisfies ErrorResponse),
    { status, headers: { "Content-Type": "application/json" } }
  );
};

const logError = (error: Error, context: string, data: Record<string, unknown> = {}): void => {
  console.error(`🚨 [${context}]`, {
    error: { message: error.message, name: error.name },
    ...data,
  });
};

const handleStreamError = (error: unknown, requestId: string, model: string): string => {
  const err = error instanceof Error ? error : new Error(String(error));
  logError(err, "Response Error", { requestId, model });

  return `[${err.name}] ${err.message}`;
};

// ============================================================================
// MODEL CONFIGURATION & MAPPING
// ============================================================================

const getModelMapping = (config: ModelConfig): ModelMapping => {
  const providerInfo = PROVIDER_MAPPING[config.provider];

  if (!providerInfo.supported || !providerInfo.name) {
    return {
      supported: false,
      message: `${config.name} (${config.provider}) support is coming soon. Currently supported: OpenAI, Google Gemini, Anthropic Claude, and xAI Grok models.`,
    };
  }

  if (!config.apiModelName) {
    return {
      supported: false,
      message: `API model name not configured for ${config.name}`,
    };
  }

  return {
    supported: true,
    provider: PROVIDERS[providerInfo.name as keyof typeof PROVIDERS],
    model: config.apiModelName,
    providerInfo,
  };
};

const buildProviderOptions = (
  config: ModelConfig,
  reasoningLevel: ReasoningLevel
): Record<string, Record<string, JSONValue>> => {
  const options: Record<string, Record<string, JSONValue>> = {};

  if (reasoningLevel && config.reasoningLevels?.includes(reasoningLevel)) {
    switch (config.provider) {
      case "Google":
        options.google = {
          thinkingConfig: {
            thinkingBudget: { low: 1024, medium: 4096, high: 8192 }[reasoningLevel],
            includeThoughts: true,
          },
        };
        break;
      case "OpenAI":
        options.openai = { reasoningEffort: reasoningLevel };
        break;
      case "xAI":
        options.xai = { reasoningEffort: reasoningLevel };
        break;
    }
  }

  return options;
};

const createModelInstance = (
  config: ModelConfig,
  mapping: ModelMappingResult,
  searchEnabled: boolean
): LanguageModel => {
  const { provider, model } = mapping;

  if (config.provider === "Google" && config.capabilities.includes("search") && searchEnabled) {
    console.log("🔍 Creating Google model with search grounding enabled", { model, searchEnabled });
    return provider(model, {
      useSearchGrounding: true,
      dynamicRetrievalConfig: { mode: "MODE_DYNAMIC" as const, dynamicThreshold: 0.3 },
    });
  }

  return provider(model);
};

const buildSystemMessage = (config: ModelConfig, searchEnabled: boolean): string => {
  const systemParts: (string | false)[] = [
    "You are a helpful AI assistant. Respond naturally and clearly.",
    config.capabilities.includes("search") &&
      searchEnabled &&
      "You have access to web search capabilities. Use search to find current information and cite sources.",
    config.capabilities.includes("image") &&
      "You can analyze and understand images provided by users.",
    config.capabilities.includes("pdf") && "You can read and analyze PDF documents.",
    "When providing code snippets, always enclose them in markdown code blocks and specify the programming language. For example, ` ```python ... ``` `. If the user requests a niche or fictional language (like 'bhailang'), use that exact name as the language specifier. This is critical for the UI to display the language name correctly.",
  ];

  return systemParts.filter(Boolean).join(" ");
};

// ============================================================================
// IMAGE GENERATION HANDLER
// ============================================================================

const handleImageGeneration = async (
  prompt: string,
  config: ModelConfig
): Promise<ImageGenerationResponse> => {
  if (!config.capabilities.includes("image-generation") || config.provider !== "OpenAI") {
    throw new Error("Only OpenAI models support image generation currently");
  }

  const timer = createTimer("Image Generation");

  try {
    const { image } = await generateImage({
      model: openai.image(config.apiModelName!),
      prompt,
      size: "1024x1024",
    });

    timer.end();

    return {
      role: "assistant",
      content: "I've generated an image based on your request.",
      parts: [
        { type: "text", text: "I've generated an image based on your request." },
        { type: "file", mimeType: "image/png", data: image.base64 },
      ],
    };
  } catch (error) {
    timer.end();
    throw error;
  }
};

// ============================================================================
// MESSAGE PROCESSING
// ============================================================================

const processHistoryMessages = (dbMessages: any[]): CoreMessage[] => {
  return dbMessages
    .map((msg): CoreMessage | null => {
      // Simple text messages
      if (msg.parts.length === 1 && msg.parts[0]?.type === "text") {
        return { role: msg.role, content: msg.parts[0].text ?? "" } as CoreMessage;
      }

      // Multi-modal messages
      const content = msg.parts
        .map((part: any) => {
          if (part.type === "text") {
            return { type: "text" as const, text: part.text ?? "" };
          }
          if (part.type === "file" && part.file?.mimeType.startsWith("image/")) {
            try {
              return { type: "image" as const, image: new URL(part.file.url) };
            } catch (e) {
              console.error("Invalid image URL in history:", e);
              return null;
            }
          }
          return null;
        })
        .filter(Boolean) as ({ type: "text"; text: string } | { type: "image"; image: URL })[];

      if (content.length > 0) {
        return { role: msg.role, content } as CoreMessage;
      }
      return null;
    })
    .filter(Boolean) as CoreMessage[];
};

const processUserMessage = async (
  lastUserMessage: Message | undefined,
  attachments: ClientAttachment[],
  modelConfig: ModelConfig
): Promise<{ coreMessage: CoreMessage | undefined; dbParts: MessagePart[] }> => {
  const dbParts: MessagePart[] = [];

  if (!lastUserMessage?.role || lastUserMessage.role !== "user") {
    return { coreMessage: undefined, dbParts };
  }

  // Add text part
  if (typeof lastUserMessage.content === "string" && lastUserMessage.content.trim()) {
    dbParts.push({ type: "text", text: lastUserMessage.content });
  }

  // Add file parts for database
  attachments?.forEach((att) => {
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
  });

  // Build core message for AI
  const textPart =
    typeof lastUserMessage.content === "string" && lastUserMessage.content.trim()
      ? [{ type: "text" as const, text: lastUserMessage.content }]
      : [];

  const fileParts = await Promise.all(
    attachments?.map(async (att: ClientAttachment) => {
      if (!att.contentType || !att.url) return null;

      try {
        const response = await fetch(att.url);
        if (!response.ok) return null;

        const buffer = await response.arrayBuffer();

        if (att.contentType.startsWith("image/")) {
          return {
            type: "image" as const,
            image: Buffer.from(buffer),
            contentType: att.contentType,
          };
        }

        if (modelConfig.capabilities.includes("pdf") && att.contentType === "application/pdf") {
          return {
            type: "file" as const,
            data: Buffer.from(buffer),
            mimeType: att.contentType,
          };
        }

        return null;
      } catch (e) {
        console.error(`Error processing attachment from ${att.url}:`, e);
        return null;
      }
    }) ?? []
  );

  const newContent = [...textPart, ...fileParts.filter(Boolean)] as (
    | { type: "text"; text: string }
    | { type: "image"; image: Buffer; contentType?: string }
    | { type: "file"; data: Buffer; mimeType: string }
  )[];

  const coreMessage =
    newContent.length > 0 ? { role: "user" as const, content: newContent } : undefined;

  return { coreMessage, dbParts };
};

// ============================================================================
// METADATA PROCESSING
// ============================================================================

const logGoogleMetadata = (
  providerMetadata: ProviderMetadata | undefined,
  model: string
): GoogleProviderMetadata["groundingMetadata"] | null => {
  const grounding = providerMetadata?.google?.groundingMetadata;

  if (grounding) {
    console.log("🔍 Grounding metadata:", {
      model,
      queries: grounding.webSearchQueries?.length ?? 0,
      chunks: grounding.groundingChunks?.length ?? 0,
      supports: grounding.groundingSupports?.length ?? 0,
    });

    if (grounding.webSearchQueries?.length) {
      console.log("🔍 Search queries:", grounding.webSearchQueries);
    }

    if (grounding.groundingChunks?.length) {
      const sources = grounding.groundingChunks
        .map((chunk) => chunk.web?.title || "Unknown")
        .filter((title, index, arr) => arr.indexOf(title) === index);
      console.log("🔍 Sources:", sources.join(", "));
    }

    if (grounding.groundingSupports?.length) {
      const totalTextLength = grounding.groundingSupports.reduce(
        (sum, support) => sum + (support.segment?.text?.length || 0),
        0
      );
      const confidenceScores = grounding.groundingSupports.flatMap((s) => s.confidenceScores || []);
      const avgConfidence =
        confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;

      console.log("🔍 Grounding coverage:", {
        segments: grounding.groundingSupports.length,
        avgConfidence: avgConfidence.toFixed(2),
        totalChars: totalTextLength,
      });
    }
  }

  return grounding;
};

// ============================================================================
// TITLE GENERATION
// ============================================================================

const generateChatTitle = async (userMessage: string): Promise<string> => {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content:
            "Generate a concise, descriptive title (max 50 characters) for this chat based on the user's first message. The title should capture the main topic or intent. Don't use quotes or extra formatting.",
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      maxTokens: 50,
      temperature: 0.7,
    });

    return text.trim().substring(0, 50);
  } catch (error) {
    console.error("Failed to generate title with GPT-4o-mini:", error);
    // Fallback to truncated user message
    return userMessage.substring(0, 50);
  }
};

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(req: Request): Promise<Response> {
  const requestTimer = createTimer("Total Request");
  const requestId = Math.random().toString(36).substring(2, 15);

  try {
    // Parse request
    const parseTimer = createTimer("Request Parsing");
    const body: ChatRequest = await req.json();
    console.log("📥 Backend request body received:", JSON.stringify(body, null, 2));

    const {
      messages,
      model = "gemini-2.5-flash",
      reasoningLevel = "medium",
      searchEnabled = false,
      id: sessionId,
    } = body;

    const lastMessageWithAttachments = messages[messages.length - 1];
    const attachments: ClientAttachment[] =
      lastMessageWithAttachments?.experimental_attachments ?? [];
    parseTimer.end();

    console.log(`🚀 Starting chat request`, {
      requestId,
      model,
      reasoningLevel,
      searchEnabled,
      sessionId,
      attachmentsCount: attachments?.length ?? 0,
    });

    // Authentication
    const authTimer = createTimer("Authentication");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authTimer.end();

    if (!user) {
      return createErrorResponse("User not authenticated", 401, "AUTH_ERROR");
    }

    // Handle session creation
    let currentSessionId = sessionId;
    let isNewSession = false;
    if (!currentSessionId || currentSessionId === "new") {
      const sessionTimer = createTimer("Session Creation");
      // Create session with temporary title first
      const newSession = await createChatSession(supabase, user.id, "New Chat");
      currentSessionId = newSession.id;
      isNewSession = true;
      sessionTimer.end();

      console.log(`✨ Created new chat session`, { newSessionId: currentSessionId });
    }

    // Get model configuration
    const modelTimer = createTimer("Model Configuration");
    const modelConfig = getModelById(model);
    modelTimer.end();

    if (!modelConfig) {
      return createErrorResponse(`Model ${model} not found`, 400);
    }

    // Handle image generation
    const lastMessage = messages[messages.length - 1];
    if (
      modelConfig.capabilities.includes("image-generation") &&
      lastMessage?.role === "user" &&
      lastMessage.content
    ) {
      try {
        const imageTimer = createTimer("Image Generation Flow");
        const result = await handleImageGeneration(lastMessage.content as string, modelConfig);
        imageTimer.end();

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), "Image Generation", {
          requestId,
          model,
        });
        return createErrorResponse("Image generation failed", 500);
      }
    }

    // Get model mapping
    const mappingTimer = createTimer("Model Mapping");
    const mapping = getModelMapping(modelConfig);
    mappingTimer.end();

    if (!mapping.supported) {
      return createErrorResponse(mapping.message, 400);
    }

    // Load and process chat history
    const historyTimer = createTimer("History Loading");
    const dbMessages = await getMessages(supabase, currentSessionId);
    const history = processHistoryMessages(dbMessages);
    historyTimer.end();

    // Process user message
    const { coreMessage: latestUserMessage, dbParts: userMessageParts } = await processUserMessage(
      messages[messages.length - 1],
      attachments,
      modelConfig
    );

    // Save user message to database
    if (userMessageParts.length > 0) {
      const saveTimer = createTimer("Message Save");
      await addMessage(supabase, {
        session_id: currentSessionId,
        user_id: user.id,
        role: "user",
        parts: userMessageParts,
        model_used: null,
        model_provider: null,
        model_config: null,
        metadata: {},
      });
      saveTimer.end();
      console.log("📝 Saved user message with structured parts to DB", {
        numParts: userMessageParts.length,
      });
    }

    // Build final messages array
    const systemMessage = buildSystemMessage(modelConfig, searchEnabled);
    const finalMessages: CoreMessage[] = [
      { role: "system", content: systemMessage },
      ...history,
      ...(latestUserMessage ? [latestUserMessage] : []),
    ];

    // Create model instance and provider options
    const modelSetupTimer = createTimer("Model Setup");
    const modelInstance = createModelInstance(modelConfig, mapping, searchEnabled);
    const providerOptions = buildProviderOptions(modelConfig, reasoningLevel);
    modelSetupTimer.end();

    // Stream response
    return createDataStreamResponse({
      execute: (dataStream: DataStreamWriter) => {
        const result = streamText({
          model: modelInstance,
          messages: finalMessages,
          ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
          onError: ({ error }) => {
            logError(error instanceof Error ? error : new Error(String(error)), "Stream Error", {
              requestId,
              model,
            });
          },
          onFinish: async ({ text, finishReason, reasoning, providerMetadata, usage }) => {
            const finishTimer = createTimer("Stream Finish Processing");

            console.log(`✅ Stream completed`, {
              requestId,
              model,
              textLength: text?.length || 0,
              finishReason,
              hasReasoning: !!reasoning,
              hasProviderMetadata: !!providerMetadata,
            });

            // Save assistant response
            const assistantSaveTimer = createTimer("Assistant Message Save");
            await addMessage(supabase, {
              session_id: currentSessionId!,
              user_id: user.id,
              role: "assistant",
              parts: [{ type: "text", text }],
              model_used: model,
              model_provider: modelConfig.provider,
              model_config: { reasoningLevel, searchEnabled, usage },
              metadata: {},
            });
            assistantSaveTimer.end();
            console.log("📝 Saved assistant response to DB");

            // Generate and update title for new sessions
            if (isNewSession) {
              const titleTimer = createTimer("Title Generation");
              try {
                const firstUserMessage = messages.find((m) => m.role === "user")?.content;
                if (typeof firstUserMessage === "string" && firstUserMessage.trim()) {
                  const generatedTitle = await generateChatTitle(firstUserMessage);
                  await updateChatSessionTitle(supabase, currentSessionId!, generatedTitle);
                  console.log("🏷️ Updated session title:", {
                    sessionId: currentSessionId,
                    title: generatedTitle,
                  });
                }
              } catch (error) {
                console.error("Failed to generate/update session title:", error);
              }
              titleTimer.end();
            }

            // Handle grounding metadata
            if (providerMetadata?.google?.groundingMetadata) {
              const groundingTimer = createTimer("Grounding Processing");
              const groundingMetadata = logGoogleMetadata(providerMetadata, model);
              groundingTimer.end();

              if (groundingMetadata) {
                console.log("🔍 Sending final grounding annotation to client");
                try {
                  dataStream.writeMessageAnnotation({
                    type: "grounding",
                    data: groundingMetadata as JSONValue,
                  });
                  console.log("✅ Final grounding annotation sent successfully");
                } catch (error) {
                  console.error("❌ Failed to send final grounding annotation:", error);
                }
              }
            }

            // Send new session ID for first message
            if (!sessionId || sessionId === "new") {
              dataStream.writeMessageAnnotation({
                type: "new_session",
                data: { sessionId: currentSessionId },
              });
              console.log("✨ Sent new session ID to client");
            }

            if (process.env.NODE_ENV === "development" && providerMetadata) {
              console.log("🔍 Full providerMetadata:", JSON.stringify(providerMetadata, null, 2));
            }

            finishTimer.end();
          },
        });

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: modelConfig.capabilities.includes("reasoning"),
          sendSources: modelConfig.capabilities.includes("search") || searchEnabled,
        });
      },
      onError: (error: unknown) => handleStreamError(error, requestId, model),
    });
  } catch (error) {
    requestTimer.end();
    const err = error instanceof Error ? error : new Error(String(error));
    logError(err, "API Error", { url: req.url });

    if (err.message.includes("JSON"))
      return createErrorResponse("Invalid request format", 400, "INVALID_JSON");
    if (err.message.includes("401") || err.message.includes("unauthorized")) {
      return createErrorResponse("Authentication error", 401, "AUTH_ERROR");
    }

    return createErrorResponse("Internal server error", 500, "INTERNAL_ERROR");
  }
}
