"use client";

import { type GroundingChunk, type GroundingMetadata } from "@/types/google-metadata";
import { LinkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { memo } from "react";
import { ExpandableSection } from "./expandable-section";
import { MessageContent } from "./message-content";

interface GroundingDisplayProps {
  grounding: GroundingMetadata;
}

const GroundingDisplay = memo(({ grounding }: GroundingDisplayProps) => {
  // Helper function to get source info from chunk indices
  const getSourcesForSegment = (chunkIndices?: number[]) => {
    if (!chunkIndices || !grounding.groundingChunks) return [];

    return chunkIndices
      .map((index) => grounding.groundingChunks?.[index])
      .filter(Boolean) as GroundingChunk[];
  };

  // Extract unique domains from all sources
  const getUniqueDomains = () => {
    const domains = new Set<string>();

    if (grounding.groundingSupports) {
      grounding.groundingSupports.forEach((support) => {
        const sources = getSourcesForSegment(support.groundingChunkIndices);
        sources.forEach((source) => {
          if (source.web?.title) {
            domains.add(source.web.title);
          }
        });
      });
    }

    return Array.from(domains);
  };

  const uniqueDomains = getUniqueDomains();
  const maxDomainsToShow = 3;
  const domainText =
    uniqueDomains.length > 0
      ? `(${uniqueDomains.slice(0, maxDomainsToShow).join(", ")}${uniqueDomains.length > maxDomainsToShow ? "..." : ""})`
      : "";

  return (
    <ExpandableSection
      title={`Sources ${domainText}`}
      icon={<MagnifyingGlassIcon className="h-4 w-4" />}
      variant="source"
      defaultExpanded={false}
      noBg={true}
    >
      <div className="space-y-4">
        {grounding.webSearchQueries && grounding.webSearchQueries.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground/80">Search Queries</h4>
            <div className="space-y-2">
              {grounding.webSearchQueries.map((query: string, idx: number) => (
                <div key={idx} className="rounded-lg bg-content1/60 p-3">
                  <span className="text-sm">{query}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {grounding.groundingSupports && grounding.groundingSupports.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground/80">Grounding Details</h4>
            <div className="space-y-3">
              {grounding.groundingSupports.map((support, idx: number) => {
                const sources = getSourcesForSegment(support.groundingChunkIndices);

                return (
                  <div key={idx} className="rounded-lg bg-content1/60 p-3">
                    {support.segment?.text && (
                      <div className="mb-2 text-sm leading-relaxed text-foreground/80">
                        <MessageContent content={support.segment.text} />
                      </div>
                    )}

                    {/* Sources for this segment */}
                    {sources.length > 0 && (
                      <div className="mb-2">
                        <div className="mb-2 text-xs font-medium text-foreground/60">Sources:</div>
                        <div className="flex flex-wrap gap-1">
                          {sources.map((source, sourceIdx) => (
                            <a
                              key={sourceIdx}
                              href={source.web?.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-content2/60 px-2 py-1 text-xs text-primary transition-colors hover:text-primary/80"
                            >
                              <LinkIcon className="h-3 w-3" />
                              <span>{source.web?.title || "Source"}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Confidence scores */}
                    {support.confidenceScores && support.confidenceScores.length > 0 && (
                      <div className="text-xs text-foreground/60">
                        Confidence:{" "}
                        {support.confidenceScores
                          .map((score) => (score * 100).toFixed(1))
                          .join(", ")}
                        %
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ExpandableSection>
  );
});

GroundingDisplay.displayName = "GroundingDisplay";

export { GroundingDisplay };
