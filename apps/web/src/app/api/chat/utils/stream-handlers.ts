import { type ModelConfig, type ReasoningLevel } from "@/config/models";
import { type GoogleProviderMetadata, type ProviderMetadata } from "@/types/google-metadata";
import { type DataStreamWriter, type JSONValue, type Message } from "ai";
import { generateId, saveAssistantMessage, updateSessionTitle } from "./database";

const logGoogleMetadata = (
  providerMetadata: ProviderMetadata | undefined
): GoogleProviderMetadata["groundingMetadata"] | null => {
  const grounding = providerMetadata?.google?.groundingMetadata;
  if (grounding && process.env.NODE_ENV === "development") {
    console.log("Grounding:", {
      queries: grounding.webSearchQueries?.length ?? 0,
      chunks: grounding.groundingChunks?.length ?? 0,
      supports: grounding.groundingSupports?.length ?? 0,
    });
  }
  return grounding;
};

export const generateImageDirectly = async (
  prompt: string
): Promise<{ imageBuffer: Uint8Array; originalUrl: string }> => {
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
      let errorDetails;
      try {
        errorDetails = await response.json();
        console.error("❌ OpenAI API error details:", JSON.stringify(errorDetails, null, 2));
      } catch (jsonError) {
        console.error("❌ Failed to parse OpenAI error response:", jsonError);
        errorDetails = { error: { message: response.statusText } };
      }
      throw new Error(
        `OpenAI API error (${response.status}): ${errorDetails.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ OpenAI API response received, extracting image URL...");

    if (!data.data || !data.data[0] || !data.data[0].url) {
      console.error("❌ Invalid OpenAI API response structure:", JSON.stringify(data, null, 2));
      throw new Error("Invalid response from OpenAI API - no image URL found");
    }

    const imageUrl = data.data[0].url;
    console.log("🔗 Image URL received:", imageUrl);

    // Download the image from OpenAI
    console.log("⬇️ Downloading image from OpenAI...");
    const imageResponse = await fetch(imageUrl);
    console.log(
      "⬇️ Image download response status:",
      imageResponse.status,
      imageResponse.statusText
    );

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
    console.error("❌ Error in generateImageDirectly:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Unexpected error during image generation: ${String(error)}`);
  }
};

export const createStreamHandlers = (
  supabase: any,
  sessionId: string,
  userId: string,
  model: string,
  modelConfig: ModelConfig,
  reasoningLevel: ReasoningLevel,
  searchEnabled: boolean,
  isNewSession: boolean,
  messages: Message[]
) => ({
  onFinish: async ({ text, providerMetadata, usage }: any, dataStream: DataStreamWriter) => {
    const messageId = generateId();
    const imageGenRegex = /\[GENERATE_IMAGE: (.*)\]/s;
    const match = text?.match(imageGenRegex);

    console.log("🔍 Image generation capabilities:", modelConfig.capabilities, messageId, match);

    if (match && match[1] && modelConfig.capabilities.includes("image-generation")) {
      // Handle image generation with direct API call
      console.log("🖼️ Image generation requested for prompt:", match[1]);
      console.log("👤 User ID:", userId, "💬 Session ID:", sessionId, "🔧 Message ID:", messageId);

      try {
        console.log("🎯 Calling generateImageDirectly...");
        const { imageBuffer } = await generateImageDirectly(match[1]);
        const filePath = `uploads/${userId}/generated-${messageId}.png`;
        console.log("📁 Preparing to upload to path:", filePath);

        // Upload to Supabase storage
        console.log("☁️ Uploading to Supabase storage...");
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, imageBuffer, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) {
          console.error("❌ Supabase storage upload error:", uploadError);
          console.error("❌ Upload error details:", JSON.stringify(uploadError, null, 2));
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        console.log("✅ Upload successful:", uploadData);

        const { data: publicUrlData } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(uploadData.path);

        console.log("🔗 Generated public URL:", publicUrlData.publicUrl);

        const imageUrl = publicUrlData.publicUrl;
        const responseText =
          text.replace(imageGenRegex, "").trim() || "Here is the generated image:";

        console.log("💾 Saving message to database...");
        await saveAssistantMessage(
          supabase,
          messageId,
          sessionId,
          userId,
          [
            { type: "text", text: responseText },
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
          { reasoningLevel, searchEnabled, usage },
          { originalText: text }
        );

        console.log("📡 Sending stream annotation...");
        dataStream.writeMessageAnnotation({
          type: "file_part",
          data: {
            type: "file",
            mimeType: "image/png",
            url: imageUrl,
            filename: "generated-image.png",
          },
        });

        console.log("✅ Image generation completed successfully!");
      } catch (error) {
        console.error("❌ =========================");
        console.error("❌ IMAGE GENERATION ERROR:");
        console.error("❌ =========================");
        console.error(
          "❌ Error type:",
          error instanceof Error ? error.constructor.name : typeof error
        );
        console.error("❌ Error message:", error instanceof Error ? error.message : String(error));
        console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack trace");
        console.error("❌ Raw error object:", error);
        console.error("❌ =========================");

        const errText = error instanceof Error ? error.message : "Image generation failed.";

        try {
          console.log("💾 Saving error message to database...");
          await saveAssistantMessage(
            supabase,
            messageId,
            sessionId,
            userId,
            [{ type: "text", text: `Sorry, I couldn't generate the image. ${errText}` }],
            model,
            modelConfig.provider,
            { reasoningLevel, searchEnabled, usage },
            { isError: true }
          );

          console.log("📡 Sending error stream annotation...");
          dataStream.writeMessageAnnotation({
            type: "error",
            data: { message: `Image generation failed: ${errText}` },
          });
        } catch (saveError) {
          console.error("❌ Failed to save error message:", saveError);
        }
      }
    } else if (text) {
      // Handle regular text response
      await saveAssistantMessage(
        supabase,
        messageId,
        sessionId,
        userId,
        [{ type: "text", text }],
        model,
        modelConfig.provider,
        { reasoningLevel, searchEnabled, usage }
      );
    }

    // Send message saved annotation
    dataStream.writeMessageAnnotation({
      type: "message_saved",
      data: { databaseId: messageId, sessionId },
    });

    // Update title for new sessions
    if (isNewSession) {
      await updateSessionTitle(supabase, sessionId, messages);
    }

    // Handle grounding metadata
    const groundingMetadata = logGoogleMetadata(providerMetadata);
    if (groundingMetadata) {
      dataStream.writeMessageAnnotation({
        type: "grounding",
        data: groundingMetadata as JSONValue,
      });
    }

    // Send new session ID if applicable
    if (isNewSession) {
      dataStream.writeMessageAnnotation({
        type: "new_session",
        data: { sessionId },
      });
    }
  },
});
