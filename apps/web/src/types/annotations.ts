import { type JSONValue } from "ai";

export interface ImageGenerationAnnotationData {
  databaseId: string;
  sessionId: string;
  content: string;
  filePart: {
    type: "file";
    mimeType: string;
    url: string;
    filename: string;
  };
}

export type TypedImageGenerationAnnotation = {
  type: "image_generation_complete";
  data: ImageGenerationAnnotationData;
} & Record<string, JSONValue>;
