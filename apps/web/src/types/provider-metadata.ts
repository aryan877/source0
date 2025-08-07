// AI SDK v5 Google Provider Metadata Types

// Grounding segment for text that is supported by search results
export interface GroundingSegment {
  text?: string;
  startIndex?: number;
  endIndex?: number;
}

// Support information for grounded text segments  
export interface GroundingSupport {
  segment?: GroundingSegment;
  groundingChunkIndices?: number[];
  confidenceScores?: number[];
}

// Web source information from search results
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

// AI SDK v5 grounding metadata structure for Google models
export interface GroundingMetadata {
  // AI SDK v5: webSearchQueries for Google Generative AI models
  webSearchQueries?: string[] | null;
  // AI SDK v5: retrievalQueries for Vertex AI models (same data, different name)
  retrievalQueries?: string[] | null;
  // Search entry point content
  searchEntryPoint?: {
    renderedContent?: string;
  } | null;
  // Support details for grounded text segments
  groundingSupports?: GroundingSupport[] | null;
  // Web sources and chunks
  groundingChunks?: GroundingChunk[] | null;
}

// Google provider metadata for AI SDK v5
export interface GoogleProviderMetadata {
  groundingMetadata?: GroundingMetadata;
  safetyRatings?: Record<string, unknown> | null;
  // Additional AI SDK v5 metadata
  urlContextMetadata?: Record<string, unknown> | null;
}

// Provider metadata container for all providers
export interface ProviderMetadata {
  google?: GoogleProviderMetadata;
  [key: string]: unknown;
}

// Type guards for grounding data
export function hasGroundingData(metadata: GroundingMetadata | undefined): boolean {
  if (!metadata) return false;
  
  return Boolean(
    (metadata.webSearchQueries && metadata.webSearchQueries.length > 0) ||
    (metadata.retrievalQueries && metadata.retrievalQueries.length > 0) ||
    (metadata.groundingChunks && metadata.groundingChunks.length > 0) ||
    (metadata.groundingSupports && metadata.groundingSupports.length > 0)
  );
}

// Extract search queries from either webSearchQueries or retrievalQueries
export function getSearchQueries(metadata: GroundingMetadata | undefined): string[] {
  if (!metadata) return [];
  return metadata.webSearchQueries || metadata.retrievalQueries || [];
}
