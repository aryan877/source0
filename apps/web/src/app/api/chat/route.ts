import { type ReasoningLevel } from "@/config/models";
import { createDataStreamResponse, streamText, type Message } from "ai";
import {
  createOrGetSession,
  getAuthenticatedUser,
  saveAssistantMessage,
  saveUserMessage,
} from "./utils/database";
import { createErrorResponse, getErrorResponse, handleStreamError } from "./utils/errors";
import { processMessages } from "./utils/messages";
import {
  buildProviderOptions,
  buildSystemMessage,
  createModelInstance,
  getModelById,
  getModelMapping,
} from "./utils/models";
import { createStreamHandlers } from "./utils/stream-handlers";

export const maxDuration = 30;

interface ChatRequest {
  messages: Message[];
  model?: string;
  reasoningLevel?: ReasoningLevel;
  searchEnabled?: boolean;
  id?: string;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body: ChatRequest = await req.json();
    const {
      messages,
      model = "gemini-2.5-flash",
      reasoningLevel = "medium",
      searchEnabled = false,
      id: sessionId,
    } = body;

    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResponse("User not authenticated", 401, "AUTH_ERROR");
    }

    const { sessionId: currentSessionId, isNewSession } = await createOrGetSession(
      supabase,
      user.id,
      sessionId
    );

    const modelConfig = getModelById(model);
    if (!modelConfig) {
      return createErrorResponse(`Model ${model} not found`, 400);
    }

    const mapping = getModelMapping(modelConfig);
    if (!mapping.supported) {
      return createErrorResponse(mapping.message, 400);
    }

    const { coreMessages, userMessageToSave } = await processMessages(messages, modelConfig);

    if (userMessageToSave) {
      await saveUserMessage(supabase, userMessageToSave, currentSessionId, user.id);
    }

    // Check for image generation request BEFORE streaming
    const lastUserMessage = messages[messages.length - 1];
    const userText = typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "";
    const imageGenRegex = /(?:generate|create|make).*(?:image|picture|photo|drawing)/i;
    const isImageGenerationRequest =
      imageGenRegex.test(userText) && modelConfig.capabilities.includes("image-generation");

    console.log("🔍 Checking for image generation request:");
    console.log("User message:", userText);
    console.log(
      "Has image-generation capability:",
      modelConfig.capabilities.includes("image-generation")
    );
    console.log("Is image generation request:", isImageGenerationRequest);

    // If this is an image generation request, handle it directly
    if (isImageGenerationRequest) {
      console.log("🎨 Direct image generation requested, bypassing streaming...");

      // Import the image generation function
      const { generateImageDirectly } = await import("./utils/stream-handlers");

      try {
        const imagePrompt = userText.replace(imageGenRegex, "").trim() || userText;
        const { imageBuffer } = await generateImageDirectly(imagePrompt);
        const { generateId } = await import("./utils/database");
        const messageId = generateId();
        const filePath = `uploads/${user.id}/generated-${messageId}.png`;

        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, imageBuffer, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(uploadData.path);

        const imageUrl = publicUrlData.publicUrl;

        // Save the assistant message
        await saveAssistantMessage(
          supabase,
          messageId,
          currentSessionId,
          user.id,
          [
            { type: "text", text: "Here is the generated image:" },
            {
              type: "file",
              file: {
                name: "generated-image.png",
                mimeType: "image/png",
                url: imageUrl,
                path: filePath,
                size: imageBuffer.length,
              },
            },
          ],
          model,
          modelConfig.provider,
          { reasoningLevel, searchEnabled },
          {}
        );

        // Return streaming response compatible with frontend
        return createDataStreamResponse({
          execute: (dataStream) => {
            // Write the text content first
            dataStream.writeData("Here is the generated image:");

            // Send the message saved annotation
            dataStream.writeMessageAnnotation({
              type: "message_saved",
              data: { databaseId: messageId, sessionId: currentSessionId },
            });

            // Send the image file
            dataStream.writeMessageAnnotation({
              type: "file_part",
              data: {
                type: "file",
                mimeType: "image/png",
                url: imageUrl,
                filename: "generated-image.png",
              },
            });
          },
          onError: (error: unknown) => handleStreamError(error, "ImageGeneration"),
        });
      } catch (error) {
        console.error("❌ Direct image generation failed:", error);
        return createErrorResponse(
          `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          500,
          "IMAGE_GENERATION_ERROR"
        );
      }
    }

    const systemMessage = buildSystemMessage(modelConfig, searchEnabled, isImageGenerationRequest);
    const finalMessages = [{ role: "system" as const, content: systemMessage }, ...coreMessages];

    const modelInstance = createModelInstance(modelConfig, mapping, searchEnabled);
    const providerOptions = buildProviderOptions(modelConfig, reasoningLevel);

    return createDataStreamResponse({
      execute: (dataStream) => {
        const streamHandlers = createStreamHandlers(
          supabase,
          currentSessionId,
          user.id,
          model,
          modelConfig,
          reasoningLevel,
          searchEnabled,
          isNewSession,
          messages
        );

        const result = streamText({
          model: modelInstance,
          messages: finalMessages,
          maxSteps: 5,
          ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
          onFinish: (finishResult) => streamHandlers.onFinish(finishResult, dataStream),
          onError: ({ error }) =>
            console.error("Stream error:", error instanceof Error ? error.message : String(error)),
        });

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: modelConfig.capabilities.includes("reasoning"),
          sendSources: modelConfig.capabilities.includes("search") || searchEnabled,
        });
      },
      onError: (error: unknown) => handleStreamError(error, "DataStream"),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return getErrorResponse(err);
  }
}
