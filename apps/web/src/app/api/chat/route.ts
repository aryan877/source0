import { getModelById, type ReasoningLevel } from "@/config/models";
import {
  saveAssistantMessageServer,
  saveUserMessageServer,
} from "@/services/server/chat-messages.server";
import { createOrGetSession } from "@/services/server/chat-sessions.server";
import { generateTitleOnly } from "@/services/server/generate-chat-title";
import { getActiveMcpServersForUser } from "@/services/server/mcp-servers.server";
import { saveMessageSummary } from "@/services/server/message-summaries.server";
import { saveModelUsageLog } from "@/services/server/usage-logs.server";
import { getUserApiKey, shouldUseUserApiKey } from "@/services/server/user-api-keys.server";
import { CustomUIMessage, type MessageMetadata } from "@/types/custom-ui-message";
import { type GoogleProviderMetadata, hasGroundingData } from "@/types/provider-metadata";
import { createClient } from "@/utils/supabase/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStream,
  generateObject,
  JsonToSseTransformStream,
  stepCountIs,
  streamText,
} from "ai";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod/v3";
import { createErrorResponse, getErrorResponse } from "./utils/errors";
import { discoverMcpTools } from "./utils/mcp-tools";
import {
  buildProviderOptions,
  buildSystemMessage,
  createModelInstance,
  getModelMappingWithPermissions,
} from "./utils/models";
import { getToolsForModel } from "./utils/tools";

const MessageSummarySchema = z.object({
  summary: z.string().describe("A very short, concise summary (5-10 words) of the message content"),
});

async function generateAndSaveSummary(
  message: { id: string; content: string },
  sessionId: string,
  userId: string
) {
  try {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    const { object } = await generateObject({
      model: openrouter("openai/gpt-4o-mini"),
      schema: MessageSummarySchema,
      prompt: `Generate a very short, concise summary (5-10 words) of the following message content. Capture the core essence of the message.\n\nMessage Content:\n---\n${message.content}\n---`,
    });
    await saveMessageSummary({
      message_id: message.id,
      session_id: sessionId,
      user_id: userId,
      summary: object.summary,
    });
  } catch (e) {
    console.error(`Failed to generate/save summary for message ${message.id}`, e);
  }
}

interface ChatRequest {
  messages: CustomUIMessage[];
  model?: string;
  reasoningLevel?: ReasoningLevel;
  searchEnabled?: boolean;
  imageGenerationEnabled?: boolean;
  memoryEnabled?: boolean;
  showChatNavigator?: boolean;
  sessionId?: string;
  isFirstMessage?: boolean;
  apiKey?: string;
  assistantName?: string;
  userTraits?: string;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body: ChatRequest = await req.json();
    const {
      messages,
      model = "gemini-2.5-flash",
      reasoningLevel = "medium",
      searchEnabled = false,
      imageGenerationEnabled = false,
      memoryEnabled = true,
      showChatNavigator = false,
      sessionId,
      isFirstMessage = false,
      apiKey,
      assistantName,
      userTraits,
    } = body;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createErrorResponse("User not authenticated", 401, "AUTH_ERROR");
    }

    const { sessionId: finalSessionId, isNewSession } = await createOrGetSession(
      user.id,
      sessionId
    );

    // For new sessions, verify the session exists in the database before proceeding
    // This prevents foreign key constraint violations due to race conditions
    if (isNewSession) {
      let retries = 0;
      const maxRetries = 3;
      let sessionExists = false;

      while (retries < maxRetries && !sessionExists) {
        const { data: session, error } = await supabase
          .from("chat_sessions")
          .select("id")
          .eq("id", finalSessionId)
          .single();

        if (session && !error) {
          sessionExists = true;
          break;
        }

        if (retries < maxRetries - 1) {
          // Wait before retrying (exponential backoff: 50ms, 100ms, 200ms)
          await new Promise((resolve) => setTimeout(resolve, 50 * Math.pow(2, retries)));
        }
        retries++;
      }

      if (!sessionExists) {
        return createErrorResponse(
          "Failed to create chat session. Please try again.",
          500,
          "SESSION_CREATION_ERROR"
        );
      }
    }

    const mcpServerList = await getActiveMcpServersForUser(user.id);
    const { tools: consolidatedMcpTools, errors: mcpConnectionErrors } =
      await discoverMcpTools(mcpServerList);

    if (mcpConnectionErrors.length > 0) {
      const errorDetails = mcpConnectionErrors
        .map(({ serverName, message }) => `- ${serverName}: ${message}`)
        .join("\n");
      const errorMessage = `[MCP Connection Error] Failed to connect to the following tool servers:\n${errorDetails}\n\nPlease check your MCP server configurations in Settings > MCP Servers.`;
      return createErrorResponse(errorMessage, 500, "MCP_CONNECTION_ERROR");
    }

    const modelConfig = getModelById(model);
    if (!modelConfig) {
      return createErrorResponse(`Model ${model} not found`, 400);
    }

    // Check if user should use their own API key for this provider
    let effectiveApiKey = apiKey;
    if (await shouldUseUserApiKey(user.id, modelConfig.provider)) {
      const userApiKeyData = await getUserApiKey(user.id, modelConfig.provider);
      if (userApiKeyData) {
        effectiveApiKey = userApiKeyData.api_key_encrypted; // Already decrypted by the service
      }
    }

    const mapping = await getModelMappingWithPermissions(
      modelConfig,
      effectiveApiKey,
      supabase,
      user.id
    );
    if (!mapping.supported) {
      return createErrorResponse(mapping.message, 400);
    }

    const coreMessages = convertToModelMessages(messages);

    // Save the user message (last message in the array)
    const userMessageToSave = messages.at(-1);
    if (userMessageToSave && userMessageToSave.role === "user") {
      const savedUserMessage = await saveUserMessageServer(
        userMessageToSave,
        finalSessionId,
        user.id
      );

      if (showChatNavigator) {
        const textPart = userMessageToSave.parts.find((p) => p.type === "text");
        const userMessageText = textPart?.text || JSON.stringify(userMessageToSave.parts);
        await generateAndSaveSummary(
          {
            id: savedUserMessage.id,
            content: userMessageText,
          },
          finalSessionId,
          user.id
        );
      }
    }

    const systemMessage = buildSystemMessage(
      modelConfig,
      searchEnabled,
      memoryEnabled,
      userTraits,
      assistantName
    );

    const modelInstance = createModelInstance(modelConfig, mapping);

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          const result = streamText({
            model: modelInstance,
            messages: [{ role: "system" as const, content: systemMessage }, ...coreMessages],
            tools: getToolsForModel(
              user.id,
              searchEnabled,
              imageGenerationEnabled,
              memoryEnabled,
              consolidatedMcpTools,
              {
                capabilities: modelConfig.capabilities,
                supportsFunctions: modelConfig.supportsFunctions,
                provider: modelConfig.provider,
              },
              finalSessionId,
              userMessageToSave?.id
            ),
            stopWhen: stepCountIs(10),
            providerOptions: buildProviderOptions(modelConfig, reasoningLevel, effectiveApiKey),
            onError: ({ error }) => {
              console.error("streamText error:", error);
            },
            onFinish: async ({ providerMetadata, text }) => {
              // Stream grounding data if available
              const googleMetadata = providerMetadata?.google as GoogleProviderMetadata | undefined;
              if (googleMetadata?.groundingMetadata) {
                writer.write({
                  type: "data-grounding",
                  data: {
                    hasGrounding: hasGroundingData(googleMetadata.groundingMetadata),
                    grounding: googleMetadata.groundingMetadata,
                    timestamp: Date.now(),
                  },
                });
              }

              // Stream title for first message
              if (isFirstMessage && text) {
                try {
                  const title = await generateTitleOnly(text);
                  writer.write({
                    type: "data-titleGenerated",
                    data: { title, timestamp: Date.now() },
                  });
                } catch (error) {
                  console.error("Title generation failed:", error);
                }
              }
            },
          });

          const uiMessageStream = result.toUIMessageStream({
            generateMessageId: () => uuidv4(),
            sendReasoning: true, // Enable reasoning tokens streaming
            messageMetadata: ({ part }) => {
              if (part.type === "start") {
                return {
                  model: modelConfig.id,
                  modelProvider: modelConfig.provider,
                  createdAt: Date.now(),
                  reasoningLevel,
                  searchEnabled,
                  imageGenerationEnabled,
                };
              }
              if (part.type === "finish") {
                return {
                  model: modelConfig.id,
                  modelProvider: modelConfig.provider,
                  totalTokens: part.totalUsage?.totalTokens,
                  promptTokens: part.totalUsage?.inputTokens,
                  completionTokens: part.totalUsage?.outputTokens,
                  reasoningTokens: part.totalUsage?.reasoningTokens,
                  userId: user.id,
                };
              }
            },
          });

          try {
            writer.merge(uiMessageStream);
          } catch (mergeError) {
            console.error("Error during stream merge:", mergeError);
            throw mergeError;
          }
        } catch (streamError) {
          console.error("Stream execution error:", streamError);
          throw streamError;
        }
      },
      onFinish: async ({ responseMessage }) => {
        if (!responseMessage) return;

        let finishError = false;
        try {
          // Save assistant message
          const savedMessage = await saveAssistantMessageServer(
            responseMessage as CustomUIMessage,
            finalSessionId,
            user.id,
            model,
            modelConfig.provider,
            { reasoningLevel, searchEnabled, imageGenerationEnabled }
          );

          // Save token usage log
          const tokenUsage = responseMessage.metadata as MessageMetadata;
          if (tokenUsage?.totalTokens && tokenUsage?.promptTokens && tokenUsage?.completionTokens) {
            await saveModelUsageLog({
              user_id: user.id,
              session_id: finalSessionId,
              model_id: model,
              provider: modelConfig.provider,
              prompt_tokens: tokenUsage.promptTokens,
              completion_tokens: tokenUsage.completionTokens,
              total_tokens: tokenUsage.totalTokens,
              reasoning_tokens: tokenUsage.reasoningTokens || 0,
            });
          }

          // Generate summary if navigator enabled
          if (showChatNavigator) {
            const textPart = responseMessage.parts?.find((p) => p.type === "text");
            if (textPart && "text" in textPart) {
              await generateAndSaveSummary(
                { id: savedMessage.id, content: textPart.text },
                finalSessionId,
                user.id
              );
            }
          }

          // Update session title from data parts
          if (isFirstMessage) {
            const titleParts =
              responseMessage.parts?.filter((p) => {
                return "type" in p && p.type === "data-titleGenerated";
              }) || [];
            const latestTitle = titleParts[titleParts.length - 1];
            if (
              latestTitle &&
              "data" in latestTitle &&
              latestTitle.data &&
              typeof latestTitle.data === "object" &&
              "title" in latestTitle.data
            ) {
              await supabase
                .from("chat_sessions")
                .update({ title: latestTitle.data.title as string })
                .eq("id", finalSessionId);
            }
          }
        } catch (error) {
          console.error("Failed to save response:", error);
          finishError = true;
        }
      },
    });

    // Convert to SSE format immediately for direct response
    const sseStream = stream.pipeThrough(new JsonToSseTransformStream());

    return new Response(sseStream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
        "Content-Encoding": "none",
        "Transfer-Encoding": "chunked",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Fatal error in POST:", error);
    const err = error instanceof Error ? error : new Error(String(error));

    return getErrorResponse(err, {
      headers: req.headers,
    });
  }
}
