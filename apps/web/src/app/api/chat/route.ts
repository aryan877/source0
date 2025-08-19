import { getModelById, type ReasoningLevel } from "@/config/models";
import { saveAssistantMessageServer, saveUserMessageServer } from "@/services/chat-messages.server";
import { createOrGetSession } from "@/services/chat-sessions.server";
import { appendStreamId, loadStreams } from "@/services/chat-streams.server";
import { generateTitleOnly } from "@/services/generate-chat-title";
import { getActiveMcpServersForUser } from "@/services/mcp-servers.server";
import { saveMessageSummary } from "@/services/message-summaries";
import { saveModelUsageLog } from "@/services/usage-logs.server";
import { CustomUIMessage, type MessageMetadata } from "@/types/custom-ui-message";
import { type GoogleProviderMetadata, hasGroundingData } from "@/types/provider-metadata";
import { createClient } from "@/utils/supabase/server";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  generateId,
  generateObject,
  JsonToSseTransformStream,
  stepCountIs,
  streamText,
} from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { z } from "zod/v3";
import { createErrorResponse, getErrorResponse } from "./utils/errors";
import { discoverMcpTools } from "./utils/mcp-tools";
import { buildSystemMessage, createModelInstance, getModelMapping } from "./utils/models";
import { getToolsForModel } from "./utils/tools";

const MessageSummarySchema = z.object({
  summary: z.string().describe("A very short, concise summary (5-10 words) of the message content"),
});

async function generateAndSaveSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  message: { id: string; content: string },
  sessionId: string,
  userId: string
) {
  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: MessageSummarySchema,
      prompt: `Generate a very short, concise summary (5-10 words) of the following message content. Capture the core essence of the message.\n\nMessage Content:\n---\n${message.content}\n---`,
    });
    await saveMessageSummary(supabase, {
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
  id?: string;
  isFirstMessage?: boolean;
  apiKey?: string;
  assistantName?: string;
  userTraits?: string;
}

// Create resumable stream context (uses REDIS_URL from environment)
const streamContext = createResumableStreamContext({
  waitUntil: after,
});

// GET handler for resuming streams
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new Response("chatId is required", { status: 400 });
  }

  const streamIds = await loadStreams(chatId);

  if (!streamIds.length) {
    console.log(`No streams found for chat ${chatId} - likely no active stream to resume`);
    return new Response("No active streams to resume", { status: 404 });
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new Response("No recent stream found", { status: 404 });
  }

  const emptyDataStream = createUIMessageStream({
    execute: () => {},
  });

  return new Response(
    await streamContext.resumableStream(recentStreamId, () =>
      emptyDataStream.pipeThrough(new JsonToSseTransformStream())
    )
  );
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body: ChatRequest = await req.json();
    // Generate a unique stream ID for this request
    const streamId = generateId();
    const {
      messages,
      model = "gemini-2.5-flash",
      reasoningLevel = "medium",
      searchEnabled = false,
      imageGenerationEnabled = false,
      memoryEnabled = true,
      showChatNavigator = false,
      id: sessionId,
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

    const { sessionId: finalSessionId } = await createOrGetSession(user.id, sessionId);

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

    const mapping = getModelMapping(modelConfig, apiKey);
    if (!mapping.supported) {
      return createErrorResponse(mapping.message, 400);
    }

    const coreMessages = convertToModelMessages(messages);

    // Save the user message (last message in the array)
    const userMessageToSave = messages.at(-1);
    if (userMessageToSave && userMessageToSave.role === "user") {
      console.log("Saving user message:", {
        messageId: userMessageToSave.id,
        sessionId: finalSessionId,
        userId: user.id,
        partsCount: userMessageToSave.parts?.length || 0,
      });

      const savedUserMessage = await saveUserMessageServer(
        supabase,
        userMessageToSave,
        finalSessionId,
        user.id
      );

      console.log("User message saved with DB ID:", savedUserMessage.id);

      if (showChatNavigator) {
        const textPart = userMessageToSave.parts.find((p) => p.type === "text");
        const userMessageText = textPart?.text || JSON.stringify(userMessageToSave.parts);
        await generateAndSaveSummary(
          supabase,
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

    // Record this new stream so we can resume later
    await appendStreamId({ chatId: finalSessionId, streamId });

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: modelInstance,
          messages: [{ role: "system", content: systemMessage }, ...coreMessages],
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

        result.consumeStream();

        writer.merge(
          result.toUIMessageStream({
            generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
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
                  userId: user.id,
                };
              }
            },
          })
        );
      },
      onFinish: async ({ responseMessage }) => {
        if (!responseMessage) return;

        try {
          // Save assistant message
          const savedMessage = await saveAssistantMessageServer(
            supabase,
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
            await saveModelUsageLog(supabase, {
              user_id: user.id,
              session_id: finalSessionId,
              model_id: model,
              provider: modelConfig.provider,
              prompt_tokens: tokenUsage.promptTokens,
              completion_tokens: tokenUsage.completionTokens,
              total_tokens: tokenUsage.totalTokens,
            });
          }

          // Generate summary if navigator enabled
          if (showChatNavigator) {
            const textPart = responseMessage.parts?.find((p) => p.type === "text");
            if (textPart && "text" in textPart) {
              await generateAndSaveSummary(
                supabase,
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
        }
      },
    });

    // Create resumable stream and convert to SSE format
    const resumableStream = await streamContext.resumableStream(streamId, () =>
      stream.pipeThrough(new JsonToSseTransformStream())
    );

    return new Response(resumableStream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return getErrorResponse(err, {
      body: await req.text(),
      headers: req.headers,
    });
  }
}
