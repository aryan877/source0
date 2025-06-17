"use client";

import type { WebSearchToolData } from "@/types/tools";
import {
  ArrowTopRightOnSquareIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Card, CardBody, Link } from "@heroui/react";
import { type ToolInvocation } from "ai";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import { memo } from "react";

interface WebSearchDisplayProps {
  state: ToolInvocation["state"];
  data?: WebSearchToolData | null;
  args?: ToolInvocation["args"];
}

export const WebSearchDisplay = memo(({ state, data, args }: WebSearchDisplayProps) => {
  if (state === "call" || state === "partial-call") {
    const query =
      typeof args === "object" && args !== null && "query" in args
        ? String(args.query)
        : "Searching...";

    return (
      <div className="w-full space-y-4">
        {/* Header with searching indicator */}
        <div className="flex items-center">
          <div className="flex items-center gap-2 rounded-full border border-content2 bg-content2/60 px-4 py-2">
            <GlobeAltIcon className="h-4 w-4 animate-spin text-foreground/60" />
            <span className="text-sm font-medium text-foreground/80">Searching the web...</span>
          </div>
        </div>

        {/* Show the original query if available */}
        {query !== "Searching..." && (
          <div className="flex gap-2">
            <div className="flex-shrink-0 rounded-full bg-content2/60 px-3 py-1.5 text-xs text-foreground/70 transition-colors">
              <MagnifyingGlassIcon className="mr-1.5 inline h-3 w-3" />
              {query}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (state === "result") {
    if (!data) return null;

    const { originalQuery, generatedQueries, searchResults, totalResults } = data;

    const successfulResults = searchResults.filter((result) => !result.error);
    const allSources = successfulResults.flatMap((result) =>
      result.results.map((source) => ({
        ...source,
        query: result.query,
      }))
    );

    // Don't render if no successful results (real search returned no results)
    if (allSources.length === 0) {
      return null;
    }

    const formatPublishedDate = (dateString: string) => {
      try {
        // Try parsing ISO date first
        let date = parseISO(dateString);

        // If parsing failed, try parsing as a regular Date
        if (!isValid(date)) {
          date = new Date(dateString);
        }

        // If still invalid, try parsing common date formats
        if (!isValid(date)) {
          // Handle formats like "2025-06-16T21:40:04+05:30"
          const cleanedDate = dateString.replace(/([+-]\d{2}):?(\d{2})$/, "$1:$2");
          date = new Date(cleanedDate);
        }

        if (isValid(date)) {
          return formatDistanceToNow(date, { addSuffix: true });
        }

        // If all parsing attempts fail, return the original string
        return dateString;
      } catch {
        return dateString;
      }
    };

    return (
      <div className="w-full space-y-4">
        {/* Header with search icon and result count */}
        <div className="flex items-center">
          <div className="flex items-center gap-2 rounded-full border border-content2 bg-content2/60 px-4 py-2">
            <GlobeAltIcon className="h-4 w-4 text-foreground/60" />
            <span className="text-sm font-medium text-foreground/80">Search Results</span>
            <span className="text-foreground/40">•</span>
            <span className="text-sm font-medium text-foreground/70">{totalResults} results</span>
          </div>
        </div>

        {/* Horizontal scrolling query chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[originalQuery, ...generatedQueries.slice(1)].map((query, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 rounded-full bg-content2/60 px-3 py-1.5 text-xs text-foreground/70 transition-colors hover:bg-content2"
            >
              <MagnifyingGlassIcon className="mr-1.5 inline h-3 w-3" />
              {query}
            </div>
          ))}
        </div>

        {/* Horizontal scrolling source cards */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {allSources.map((source, idx) => (
            <Card
              key={idx}
              isHoverable
              className="group min-w-[320px] max-w-[320px] transition-all duration-200 hover:shadow-lg"
            >
              <CardBody className="p-0">
                <Link
                  href={source.url}
                  isExternal
                  className="block h-full p-4 text-inherit hover:text-inherit"
                >
                  <div className="space-y-3">
                    {/* Header with favicon, title and domain */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=64`}
                          alt=""
                          width={24}
                          height={24}
                          className="flex-shrink-0 rounded-md"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs text-primary-600">
                            <span className="truncate font-medium">
                              {new URL(source.url).hostname}
                            </span>
                            <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                          </div>
                        </div>
                      </div>

                      <h6 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary-600">
                        {source.title}
                      </h6>
                    </div>

                    {/* Content preview */}
                    <p className="line-clamp-3 text-xs leading-relaxed text-foreground/70">
                      {source.content}
                    </p>

                    {/* Footer with date */}
                    {source.published_date && (
                      <div className="flex items-center justify-between border-t border-divider pt-1">
                        <div className="text-xs text-foreground/50">
                          {formatPublishedDate(source.published_date)}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return null;
});

WebSearchDisplay.displayName = "WebSearchDisplay";
