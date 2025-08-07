import { getModelById, type ReasoningLevel } from "@/config/models";
import { saveAssistantMessageServer, saveUserMessageServer } from "@/services/chat-messages.server";
import { createOrGetSession } from "@/services/chat-sessions.server";
import { generateTitleOnly } from "@/services/generate-chat-title";
import { getActiveMcpServersForUser } from "@/services/mcp-servers.server";
import { saveMessageSummary } from "@/services/message-summaries";
import { CustomUIMessage } from "@/types/custom-ui-message";
import { type GoogleProviderMetadata, hasGroundingData } from "@/types/provider-metadata";
import { createClient } from "@/utils/supabase/server";
import { openai } from "@ai-sdk/openai";
import { createIdGenerator, generateObject, stepCountIs, streamText } from "ai";
import { z } from "zod";
import { createErrorResponse, getErrorResponse } from "./utils/errors";
import { discoverMcpTools } from "./utils/mcp-tools";
import { convertToModelMessages as convertToModelMessagesUtil } from "./utils/message-conversion";
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
  memoryEnabled?: boolean;
  showChatNavigator?: boolean;
  id?: string;
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

    const coreMessages = convertToModelMessagesUtil(messages);

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

    const result = streamText({
      model: modelInstance,
      messages: [{ role: "system", content: systemMessage }, ...coreMessages],
      tools: getToolsForModel(user.id, searchEnabled, memoryEnabled, consolidatedMcpTools, {
        capabilities: modelConfig.capabilities,
        supportsFunctions: modelConfig.supportsFunctions,
        provider: modelConfig.provider,
      }),
      stopWhen: stepCountIs(10), // Enable multi-step execution with up to 10 steps
    });

    // Consume the stream to ensure it runs to completion & triggers onFinish
    // even when the client response is aborted (AI SDK v5 best practice)
    result.consumeStream(); // no await

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      // Generate consistent server-side IDs for persistence (AI SDK v5 best practice)
      generateMessageId: createIdGenerator({
        prefix: "msg",
        size: 16,
      }),
      // Send model metadata with the message
      messageMetadata: ({ part }) => {
        if (part.type === "start") {
          return {
            model: modelConfig.id,
            modelProvider: modelConfig.provider,
            createdAt: Date.now(),
            reasoningLevel: reasoningLevel,
            searchEnabled: searchEnabled,
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
      onFinish: async ({ messages: allMessages, responseMessage }) => {
        // Access provider metadata from the result (available after stream completion)
        const providerMetadataResult = await result.providerMetadata;
        const googleMetadata = providerMetadataResult?.google as GoogleProviderMetadata | undefined;
        let hasGrounding = false;

        if (googleMetadata?.groundingMetadata) {
          hasGrounding = hasGroundingData(googleMetadata.groundingMetadata);

          console.log("Google grounding metadata detected:", {
            hasGrounding,
            webSearchQueries: Array.isArray(googleMetadata.groundingMetadata.webSearchQueries)
              ? googleMetadata.groundingMetadata.webSearchQueries.length
              : 0,
            retrievalQueries: Array.isArray(googleMetadata.groundingMetadata.retrievalQueries)
              ? googleMetadata.groundingMetadata.retrievalQueries.length
              : 0,
            groundingChunks: Array.isArray(googleMetadata.groundingMetadata.groundingChunks)
              ? googleMetadata.groundingMetadata.groundingChunks.length
              : 0,
            groundingSupports: Array.isArray(googleMetadata.groundingMetadata.groundingSupports)
              ? googleMetadata.groundingMetadata.groundingSupports.length
              : 0,
          });
        }

        try {
          // Save the assistant message using the UIMessage from the response
          if (responseMessage) {
            console.log("Saving assistant message:", {
              messageId: responseMessage.id,
              sessionId: finalSessionId,
              userId: user.id,
              partsCount: responseMessage.parts?.length || 0,
            });

            const savedAssistantMessage = await saveAssistantMessageServer(
              supabase,
              responseMessage,
              finalSessionId,
              user.id,
              model,
              modelConfig.provider,
              { reasoningLevel, searchEnabled },
              providerMetadataResult // Pass full provider metadata (includes grounding data)
            );

            console.log("Assistant message saved with DB ID:", savedAssistantMessage.id);

            if (showChatNavigator && responseMessage.parts) {
              const textPart = responseMessage.parts.find((p) => p.type === "text");
              if (textPart) {
                await generateAndSaveSummary(
                  supabase,
                  { id: savedAssistantMessage.id, content: textPart.text },
                  finalSessionId,
                  user.id
                );
              }
            }

            // Always update response message metadata with grounding data
            if (responseMessage) {
              responseMessage.metadata = {
                ...responseMessage.metadata,
                hasGrounding,
                ...(googleMetadata?.groundingMetadata && {
                  grounding: googleMetadata.groundingMetadata,
                }),
              };
            }
          }

          // Handle title generation for first message
          if (isFirstMessage && allMessages.length > 0) {
            const firstUserMessage = allMessages.find((msg) => msg.role === "user");
            if (firstUserMessage && firstUserMessage.parts) {
              const firstUserMessageTextPart = firstUserMessage.parts.find(
                (p) => p.type === "text"
              );
              if (firstUserMessageTextPart) {
                const generatedTitle = await generateTitleOnly(firstUserMessageTextPart.text);
                await supabase
                  .from("chat_sessions")
                  .update({ title: generatedTitle })
                  .eq("id", finalSessionId);

                // Also update the response message metadata to include the generated title
                if (responseMessage) {
                  responseMessage.metadata = {
                    ...responseMessage.metadata,
                    titleGenerated: generatedTitle,
                    hasGrounding,
                    ...(googleMetadata?.groundingMetadata && {
                      grounding: googleMetadata.groundingMetadata,
                    }),
                  };
                }
              }
            }
          }
        } catch (error) {
          console.error("Error in onFinish callback:", error);
        }
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
