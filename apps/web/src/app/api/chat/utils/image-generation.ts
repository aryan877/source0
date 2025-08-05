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
 * Execute image generation using OpenAI's REST API directly
 */
export async function executeImageGeneration({
  prompt,
  size = "1024x1024",
  style = "vivid",
}: ImageGenerationOptions): Promise<ImageGenerationResponse> {
  try {
    console.log(`Generating image with prompt: "${prompt}" (${size}, ${style})`);

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
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
        success: false,
        error: errorMessage,
        prompt,
        message: `❌ Failed to generate image: ${errorMessage}`,
      };
    }

    const data = await response.json();

    if (!data.data || !data.data[0]?.b64_json) {
      return {
        success: false,
        error: "No image data returned",
        prompt,
        message: `❌ No image data received from OpenAI`,
      };
    }

    const base64Data = data.data[0].b64_json;
    const imageUrl = `data:image/png;base64,${base64Data}`;
    const imageData = new Uint8Array(Buffer.from(base64Data, "base64"));

    console.log(`✅ Image generation successful for prompt: "${prompt}"`);

    return {
      success: true,
      imageUrl,
      imageData,
      prompt: prompt.trim(),
      size,
      style,
      message: `✅ Successfully generated image: "${prompt}"`,
    };
  } catch (error) {
    console.error("Image generation failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      error: errorMessage,
      prompt,
      message: `❌ Failed to generate image: ${errorMessage}`,
    };
  }
}
