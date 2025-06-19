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

export type TypedImagePendingAnnotation = {
  type: "image_generation_pending";
  data: {
    messageId: string;
    content: string;
    prompt: string;
  };
};

export type TypedImageErrorAnnotation = {
  type: "image_generation_error";
  data: {
    messageId: string;
    error: string;
  };
};

export type MessageCompleteAnnotation = {
  type: "message_complete";
};
