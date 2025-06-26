import { ModelConfig } from "@/config/models";
import { saveAssistantMessageServer } from "@/services/chat-messages.server";
import { saveGeneratedImage } from "@/services/generated-images.server";
import { saveModelUsageLog } from "@/services/usage-logs.server";
import { CustomFileUIPart } from "@/utils/core-message-processor";
import { openai } from "@ai-sdk/openai";
import { type SupabaseClient, type User } from "@supabase/supabase-js";
import {
  createDataStreamResponse,
  generateId,
  experimental_generateImage as generateImage,
  type Message,
} from "ai";
import OpenAI from "openai";
import { handleStreamError } from "./errors";

const openaiClient = new OpenAI();

interface ImageAttachment {
  contentType?: string;
  url?: string;
  name?: string;
}

export async function handleImageGenerationRequest(
  supabase: SupabaseClient,
  user: User,
  sessionId: string,
  modelConfig: ModelConfig,
  prompt: string,
  imageAttachments?: ImageAttachment[]
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
        let imageBuffer: Uint8Array;

        // Check if we have input images for image-to-image generation
        if (imageAttachments && imageAttachments.length > 0) {
          // Image-to-image generation using images.edit
          const inputImages: File[] = [];

          for (const attachment of imageAttachments) {
            if (attachment.url) {
              const response = await fetch(attachment.url);
              if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const file = new File([arrayBuffer], attachment.name || "input.png", {
                  type: attachment.contentType || "image/png",
                });
                inputImages.push(file);
              }
            }
          }

          if (inputImages.length > 0) {
            const imageToEdit = inputImages[0];
            if (!imageToEdit) {
              throw new Error("Could not retrieve the image to edit.");
            }
            // Use the edit endpoint for image-to-image generation
            const result = await openaiClient.images.edit({
              model: "gpt-image-1",
              image: imageToEdit,
              prompt: prompt.trim(),
              size: "1024x1024",
            });

            const imageBase64 = result.data?.[0]?.b64_json;
            if (!imageBase64) {
              throw new Error("No image data returned from OpenAI");
            }
            imageBuffer = Buffer.from(imageBase64, "base64");
          } else {
            throw new Error("Failed to process input images");
          }
        } else {
          // Text-to-image generation using the original approach
          const { image } = await generateImage({
            model: openai.image("gpt-image-1"),
            prompt: prompt.trim(),
            size: "1024x1024",
            providerOptions: {
              openai: { quality: "auto" },
            },
          });

          imageBuffer = image.uint8Array;
        }
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

        const savedAssistantMessage = await saveAssistantMessageServer(
          supabase,
          assistantMessage,
          sessionId,
          user.id,
          modelConfig.id,
          modelConfig.provider,
          { reasoningLevel: "low", searchEnabled: false }
        );

        try {
          await saveModelUsageLog(supabase, {
            user_id: user.id,
            session_id: sessionId,
            model_id: modelConfig.id,
            provider: modelConfig.provider,
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          });
        } catch (logError) {
          // Log it, but don't fail the whole request because of this
          console.error("Failed to save image generation usage log", logError);
        }

        try {
          await saveGeneratedImage(supabase, {
            user_id: user.id,
            session_id: sessionId,
            message_id: savedAssistantMessage.id,
            file_path: filePath,
            prompt: prompt,
          });
        } catch (imageRecordError) {
          // Log it, but don't fail the whole request because of this
          console.error("Failed to save generated image metadata", imageRecordError);
        }

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
