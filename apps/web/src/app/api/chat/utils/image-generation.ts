import { ModelConfig } from "@/config/models";
import { saveAssistantMessageServer } from "@/services/chat-messages.server";
import { CustomFileUIPart } from "@/utils/core-message-processor";
import { openai } from "@ai-sdk/openai";
import { type SupabaseClient, type User } from "@supabase/supabase-js";
import {
  createDataStreamResponse,
  generateId,
  experimental_generateImage as generateImage,
  type Message,
} from "ai";
import { handleStreamError } from "./errors";

export async function handleImageGenerationRequest(
  supabase: SupabaseClient,
  user: User,
  sessionId: string,
  modelConfig: ModelConfig,
  prompt: string
): Promise<Response> {
  const messageId = generateId();

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // 1. Send pending annotation immediately
      dataStream.writeMessageAnnotation({
        type: "image_generation_pending",
        data: {
          messageId: messageId,
          prompt: prompt,
          content: "Generating image...",
        },
      });

      try {
        const { image } = await generateImage({
          model: openai.image("gpt-image-1"),
          prompt: prompt.trim(),
          size: "1024x1024",
          providerOptions: {
            openai: { quality: "auto" },
          },
        });

        const imageBuffer = image.uint8Array;
        const filePath = `uploads/${user.id}/generated-${messageId}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, imageBuffer, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("chat-attachments").getPublicUrl(uploadData.path);

        const assistantMessage: Message = {
          id: messageId,
          role: "assistant",
          content: "Here is the generated image:",
          parts: [
            {
              type: "file",
              mimeType: "image/png",
              // @ts-expect-error - Additional fields supported by our database schema but not in AI SDK Message type
              url: publicUrl,
              filename: "generated-image.png",
              path: filePath,
              // @ts-expect-error - Additional fields supported by our database schema but not in AI SDK Message type
              size: imageBuffer.length,
            } satisfies CustomFileUIPart,
          ],
        };

        await saveAssistantMessageServer(
          supabase,
          assistantMessage,
          sessionId,
          user.id,
          modelConfig.id,
          modelConfig.provider,
          { reasoningLevel: "low", searchEnabled: false }
        );

        dataStream.writeMessageAnnotation({
          type: "image_generation_complete",
          data: {
            databaseId: messageId,
            sessionId: sessionId,
            content: "Here is the generated image:",
            filePart: {
              type: "file",
              mimeType: "image/png",
              url: publicUrl,
              filename: "generated-image.png",
            },
          },
        });
      } catch (error) {
        console.error("❌ Direct image generation failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Image generation failed. Please try again.";
        dataStream.writeMessageAnnotation({
          type: "image_generation_error",
          data: {
            messageId: messageId,
            error: errorMessage,
          },
        });
        handleStreamError(error, "ImageGeneration");
      }
    },
    onError: (error: unknown) => handleStreamError(error, "ImageGeneration"),
  });
}
