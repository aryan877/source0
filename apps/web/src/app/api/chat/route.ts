import { getModelById, type ReasoningLevel } from "@/config/models";
import { saveAssistantMessageServer, saveUserMessageServer } from "@/services/chat-messages.server";
import { createOrGetSession } from "@/services/chat-sessions.server";
import { generateTitleOnly } from "@/services/generate-chat-title";
import { getActiveMcpServersForUser } from "@/services/mcp-servers.server";
import { saveMessageSummary } from "@/services/message-summaries";
import { createClient } from "@/utils/supabase/server";
import { openai } from "@ai-sdk/openai";
import { type SupabaseClient } from "@supabase/supabase-js";
import { convertToModelMessages, generateObject, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { createErrorResponse, getErrorResponse } from "./utils/errors";

import { discoverMcpTools } from "./utils/mcp-tools";
import { processMessages } from "./utils/message-conversion";

import { buildSystemMessage, createModelInstance, getModelMapping } from "./utils/models";
import { getToolsForModel } from "./utils/tools";

const MessageSummarySchema = z.object({
  summary: z.string().describe("A very short, concise summary (5-10 words) of the message content"),
});

async function generateAndSaveSummary(
  supabase: SupabaseClient,
  message: { id: string; content?: unknown },
  sessionId: string,
  userId: string
) {
  if (!message.content) return;

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: MessageSummarySchema,
      prompt: `Generate a very short, concise summary (5-10 words) of the following message content. Capture the core essence of the message.\n\nMessage Content:\n---\n${JSON.stringify(
        message.content
      )}\n---`,
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
  messages: UIMessage[];
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
      id,
      isFirstMessage = false,
      apiKey,
      assistantName,
      userTraits,
    } = body;

    const sessionId = id;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return createErrorResponse("User not authenticated", 401, "AUTH_ERROR");
    }

    const { sessionId: finalSessionId } = await createOrGetSession(user.id, sessionId);

    // Fetch active MCP servers and discover their tools
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

    const { coreMessages, userMessageToSave } = processMessages(messages);

    if (userMessageToSave) {
      // Convert UIMessage to ModelMessage using AI SDK's built-in converter
      const [modelMessage] = convertToModelMessages([userMessageToSave]);
      if (modelMessage) {
        const savedUserMessage = await saveUserMessageServer(
          supabase,
          modelMessage,
          finalSessionId,
          user.id
        );

        if (showChatNavigator) {
          await generateAndSaveSummary(
            supabase,
            {
              id: savedUserMessage.id,
              content: userMessageToSave.parts.find((p) => p.type === "text")?.text || "",
            },
            finalSessionId,
            user.id
          );
        }
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
      messages: [{ role: "system" as const, content: systemMessage }, ...coreMessages],
      tools: getToolsForModel(user.id, searchEnabled, memoryEnabled, consolidatedMcpTools, {
        capabilities: modelConfig.capabilities,
        supportsFunctions: modelConfig.supportsFunctions,
        provider: modelConfig.provider,
      }),
    });

    result.consumeStream();

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({ messages }) => {
        const assistantMessage = messages.at(-1);
        if (assistantMessage) {
          const [assistantModelMessage] = convertToModelMessages([assistantMessage]);
          if (assistantModelMessage) {
            await saveAssistantMessageServer(
              supabase,
              assistantModelMessage,
              finalSessionId,
              user.id,
              model,
              modelConfig.provider,
              { reasoningLevel, searchEnabled }
            );

            const assistantText = assistantMessage.parts.find((p) => p.type === "text")?.text;
            if (showChatNavigator && assistantText) {
              await generateAndSaveSummary(
                supabase,
                {
                  id: assistantMessage.id,
                  content: assistantText,
                },
                finalSessionId,
                user.id
              );
            }
          }
        }

        // Handle title generation for first message
        if (isFirstMessage && userMessageToSave) {
          const firstUserMessage =
            userMessageToSave.parts.find((p) => p.type === "text")?.text || "";

          const generatedTitle = await generateTitleOnly(firstUserMessage);

          // Update the title in the database using server-side client
          await supabase
            .from("chat_sessions")
            .update({ title: generatedTitle })
            .eq("id", finalSessionId);
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
