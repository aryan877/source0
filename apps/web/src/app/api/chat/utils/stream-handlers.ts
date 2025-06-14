import { type ModelConfig, type ReasoningLevel } from "@/config/models";
import { type GoogleProviderMetadata, type ProviderMetadata } from "@/types/google-metadata";
import { openai } from "@ai-sdk/openai";
import {
  experimental_generateImage as generateImage,
  type DataStreamWriter,
  type JSONValue,
  type Message,
} from "ai";
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

    if (match && match[1]) {
      // Handle image generation
      try {
        const { image } = await generateImage({
          model: openai.image("dall-e-3"),
          prompt: match[1].trim(),
          size: "1024x1024",
        });

        const imageUrl = `data:image/png;base64,${image.base64}`;

        await saveAssistantMessage(
          supabase,
          messageId,
          sessionId,
          userId,
          "",
          model,
          modelConfig.provider,
          { reasoningLevel, searchEnabled, usage },
          { imageUrl, originalText: text }
        );

        dataStream.writeMessageAnnotation({
          type: "image_display",
          data: { assistantMessageId: messageId, imageUrl },
        });
      } catch (error) {
        console.error("Image generation failed:", error);
        const errText = error instanceof Error ? error.message : "Image generation failed.";

        await saveAssistantMessage(
          supabase,
          messageId,
          sessionId,
          userId,
          `Sorry, I couldn't generate the image. ${errText}`,
          model,
          modelConfig.provider,
          { reasoningLevel, searchEnabled, usage },
          { isError: true }
        );

        dataStream.writeMessageAnnotation({
          type: "error",
          data: { message: `Image generation failed: ${errText}` },
        });
      }
    } else if (text) {
      // Handle regular text response
      await saveAssistantMessage(
        supabase,
        messageId,
        sessionId,
        userId,
        text,
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
