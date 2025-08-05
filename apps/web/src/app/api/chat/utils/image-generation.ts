import { openai } from "@ai-sdk/openai";
import { experimental_generateImage as generateImage } from "ai";

interface ImageGenerationOptions {
  prompt: string;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  style?: "natural" | "vivid";
}

export interface ImageGenerationResult {
  success: true;
  imageUrl: string;
  imageData: Uint8Array;
  prompt: string;
  size: string;
  style: string;
  message: string;
}

export interface ImageGenerationError {
  success: false;
  error: string;
  prompt: string;
  message: string;
}

export type ImageGenerationResponse = ImageGenerationResult | ImageGenerationError;

/**
 * Execute image generation using DALL-E 3
 */
export async function executeImageGeneration({
  prompt,
  size = "1024x1024",
  style = "vivid",
}: ImageGenerationOptions): Promise<ImageGenerationResponse> {
  try {
    console.log(`Generating image with prompt: "${prompt}" (${size}, ${style})`);

    const { image } = await generateImage({
      model: openai.image("dall-e-3"),
      prompt: prompt.trim(),
      size: size as "1024x1024" | "1024x1792" | "1792x1024",
    });

    // Convert the generated image to a data URL for display
    const base64 = Buffer.from(image.uint8Array).toString("base64");
    const imageUrl = `data:image/png;base64,${base64}`;

    return {
      success: true,
      imageUrl,
      imageData: image.uint8Array,
      prompt,
      size,
      style,
      message: `Successfully generated image: "${prompt}"`,
    };
  } catch (error) {
    console.error("Image generation failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      error: errorMessage,
      prompt,
      message: `Failed to generate image: ${errorMessage}`,
    };
  }
}
