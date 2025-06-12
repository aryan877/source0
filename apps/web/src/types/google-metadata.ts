// Google Provider Metadata Types - Single Source of Truth

export interface GroundingSupport {
  segment?: {
    startIndex?: number;
    endIndex?: number;
    text?: string;
  };
  groundingChunkIndices?: number[];
  confidenceScores?: number[];
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: {
    renderedContent?: string;
  };
  groundingSupports?: GroundingSupport[];
  groundingChunks?: GroundingChunk[];
}

export interface GoogleProviderMetadata {
  groundingMetadata?: GroundingMetadata;
  safetyRatings?: Record<string, unknown> | null;
}

export interface ProviderMetadata {
  google?: GoogleProviderMetadata;
  [key: string]: unknown;
}
