import { createClient } from "@/utils/supabase/server";
import { saveGeneratedImage } from "@/services/server/generated-images.server";
import type { ImageGenerationToolData } from "@/types/tools";

interface ImageGenerationOptions {
  prompt: string;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  style?: "natural" | "vivid";
  userId?: string;
  sessionId?: string;
  messageId?: string;
}


/**
 * Execute image generation using OpenAI's REST API directly
 */
export async function executeImageGeneration({
  prompt,
  size = "1024x1024",
  style = "vivid",
  userId,
  sessionId,
  messageId,
}: ImageGenerationOptions): Promise<ImageGenerationToolData> {
  try {
    console.log(`Generating image with prompt: "${prompt}" (${size}, ${style})`);

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
        toolName: "imageGeneration",
        success: false,
        error: "Missing OpenAI API key",
        prompt,
        message: `❌ OpenAI API key not configured in environment variables`,
      };
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt.trim(),
        n: 1,
        size,
        style,
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error("OpenAI API error:", errorData);

      return {
        toolName: "imageGeneration",
        success: false,
        error: errorMessage,
        prompt,
        message: `❌ Failed to generate image: ${errorMessage}`,
      };
    }

    const data = await response.json();

    if (!data.data || !data.data[0]?.b64_json) {
      return {
        toolName: "imageGeneration",
        success: false,
        error: "No image data returned",
        prompt,
        message: `❌ No image data received from OpenAI`,
      };
    }

    const base64Data = data.data[0].b64_json;
    const imageData = new Uint8Array(Buffer.from(base64Data, "base64"));

    console.log(`✅ Image generation successful for prompt: "${prompt}"`);

    // If storage parameters are provided, save to Supabase
    if (userId && sessionId && messageId) {
      try {
        const supabase = await createClient();
        
        // Generate unique file path
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        const fileName = `generated-image-${timestamp}-${randomId}.png`;
        const filePath = `generated-images/${userId}/${fileName}`;
        
        // Upload image to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, imageData, {
            contentType: "image/png",
            cacheControl: "3600",
            upsert: false,
          });
          
        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(uploadData.path);
          
        // Save metadata to database
        const savedImage = await saveGeneratedImage({
          user_id: userId,
          session_id: sessionId,
          message_id: messageId,
          prompt: prompt.trim(),
          file_path: uploadData.path,
        });

        return {
          toolName: "imageGeneration",
          success: true,
          imageUrl: publicUrlData.publicUrl,
          imageId: savedImage.id,
          filePath: uploadData.path,
          prompt: prompt.trim(),
          size,
          style,
          message: `Image generated successfully`,
        };
      } catch (storageError) {
        console.error("Failed to save image to storage:", storageError);
        throw new Error(`Failed to save image: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`);
      }
    }

    throw new Error("Image generation requires user context (userId, sessionId, messageId)");
  } catch (error) {
    console.error("Image generation failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return {
      toolName: "imageGeneration",
      success: false,
      error: errorMessage,
      prompt,
      message: `❌ Failed to generate image: ${errorMessage}`,
    };
  }
}
