import { ModelConfig } from "@/config/models";
import { saveAssistantMessageServer } from "@/services";
import { type SupabaseClient, type User } from "@supabase/supabase-js";
import { createDataStreamResponse, generateId, type Message } from "ai";
import { handleStreamError } from "./errors";

async function generateImageWithOpenAI(
  prompt: string
): Promise<{ imageBuffer: Uint8Array; originalUrl: string }> {
  console.log("🎨 Starting image generation with prompt:", prompt);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OpenAI API key not found in environment variables");
    throw new Error("OpenAI API key not configured");
  }

  try {
    console.log("📡 Making request to OpenAI DALL-E API...");
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt.trim(),
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url",
      }),
    });

    console.log("📡 OpenAI API response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorDetails = await response.json().catch(() => ({
        error: { message: response.statusText },
      }));
      console.error("❌ OpenAI API error details:", JSON.stringify(errorDetails, null, 2));
      throw new Error(
        `OpenAI API error (${response.status}): ${errorDetails.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ OpenAI API response received, extracting image URL...");

    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) {
      console.error("❌ Invalid OpenAI API response structure:", JSON.stringify(data, null, 2));
      throw new Error("Invalid response from OpenAI API - no image URL found");
    }
    console.log("🔗 Image URL received:", imageUrl);

    console.log("⬇️ Downloading image from OpenAI...");
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error(
        "❌ Failed to download image from OpenAI:",
        imageResponse.status,
        imageResponse.statusText
      );
      throw new Error(
        `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`
      );
    }

    const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
    console.log("✅ Image downloaded successfully, size:", imageBuffer.length, "bytes");

    return { imageBuffer, originalUrl: imageUrl };
  } catch (error) {
    console.error("❌ Error in generateImageWithOpenAI:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function handleImageGenerationRequest(
  supabase: SupabaseClient,
  user: User,
  sessionId: string,
  modelConfig: ModelConfig,
  prompt: string
): Promise<Response> {
  const messageId = generateId();

  try {
    const { imageBuffer } = await generateImageWithOpenAI(prompt);
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
          // @ts-expect-error - TODO: fix this
          url: publicUrl,
          filename: "generated-image.png",
          path: filePath,
          size: imageBuffer.length,
        },
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

    return createDataStreamResponse({
      execute: (dataStream) => {
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
      },
      onError: (error: unknown) => handleStreamError(error, "ImageGeneration"),
    });
  } catch (error) {
    console.error("❌ Direct image generation failed:", error);
    throw error;
  }
}
