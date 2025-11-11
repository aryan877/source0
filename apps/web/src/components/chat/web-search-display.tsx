"use client";

import type { ToolTypes } from "@/types/custom-ui-message";
import {
  ArrowTopRightOnSquareIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Card, CardBody, Link } from "@heroui/react";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import { memo, useMemo } from "react";

interface WebSearchDisplayProps {
  state: "output-available" | "input-streaming" | "input-available" | "output-error";
  data?: ToolTypes["webSearch"]["output"] | null;
  args?: unknown;
}

const SearchingState = memo(({ query }: { query: string }) => (
  <div className="w-full space-y-4">
    <div className="flex items-center">
      <div className="flex items-center gap-2 rounded-full bg-content3/80 px-4 py-2">
        <GlobeAltIcon className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium text-foreground/80">Searching the web...</span>
      </div>
    </div>
    {query !== "Searching..." && (
      <div className="flex gap-2">
        <div className="flex-shrink-0 rounded-full bg-default-100 px-3 py-1.5 text-xs text-foreground/70 transition-colors">
          <MagnifyingGlassIcon className="mr-1.5 inline h-3 w-3" />
          {query}
        </div>
      </div>
    )}
  </div>
));

SearchingState.displayName = "SearchingState";

interface SearchSource {
  query: string;
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
  raw_content?: string;
}

const SourceCard = memo(({ source }: { source: SearchSource }) => {
  const formatPublishedDate = useMemo(() => {
    if (!source.published_date) return null;

    try {
      let date = parseISO(source.published_date);
      if (!isValid(date)) {
        date = new Date(source.published_date);
      }
      if (!isValid(date)) {
        const cleanedDate = source.published_date.replace(/([+-]\d{2}):?(\d{2})$/, "$1:$2");
        date = new Date(cleanedDate);
      }
      return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : source.published_date;
    } catch {
      return source.published_date;
    }
  }, [source.published_date]);

  const hostname = useMemo(() => new URL(source.url).hostname, [source.url]);

  return (
    <Card
      isHoverable
      className="search-card-group min-w-[320px] max-w-[320px] bg-content2/80 shadow-none transition-colors duration-200 hover:bg-content3"
    >
      <CardBody className="p-0">
        <Link
          href={source.url}
          isExternal
          className="block h-full p-4 text-inherit hover:text-inherit"
        >
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
                  alt=""
                  width={24}
                  height={24}
                  className="flex-shrink-0 rounded-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <span className="truncate font-medium">{hostname}</span>
                    <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0 opacity-60 transition-opacity hover:opacity-100" />
                  </div>
                </div>
              </div>
              <h6 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary">
                {source.title}
              </h6>
            </div>
            <p className="line-clamp-3 text-xs leading-relaxed text-foreground/70">
              {source.content}
            </p>
            {formatPublishedDate && (
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-foreground/50">{formatPublishedDate}</div>
              </div>
            )}
          </div>
        </Link>
      </CardBody>
    </Card>
  );
});

SourceCard.displayName = "SourceCard";

export const WebSearchDisplay = memo(({ state, data, args }: WebSearchDisplayProps) => {
  // Move all hooks to top level to prevent conditional calling
  const query = useMemo(
    () =>
      typeof args === "object" && args !== null && "query" in args
        ? String(args.query)
        : "Searching...",
    [args]
  );

  const processedData = useMemo(() => {
    if (!data || !("searchResults" in data)) return { allSources: [], queries: [] };

    const searchResults = data.searchResults as any[];
    const successfulResults = searchResults.filter((result) => !result.error);
    const allSources = successfulResults.flatMap((result) =>
      result.results.map((source: any) => ({
        ...source,
        query: result.query,
      }))
    );
    const queries = [data.originalQuery, ...data.generatedQueries.slice(1)];

    return { allSources, queries };
  }, [data]);

  // Stable render functions
  const renderSearchingState = useMemo(() => {
    if (state !== "input-streaming" && state !== "input-available") return null;
    return <SearchingState query={query} />;
  }, [state, query]);

  const renderResultsState = useMemo(() => {
    if (state !== "output-available" || !data || processedData.allSources.length === 0) return null;

    return (
      <div className="w-full space-y-4">
        <div className="flex items-center">
          <div className="flex items-center gap-2 rounded-full bg-content3/80 px-4 py-2">
            <GlobeAltIcon className="h-4 w-4 text-foreground/60" />
            <span className="text-sm font-medium text-foreground/80">Search Results</span>
            <span className="text-foreground/40">•</span>
            <span className="text-sm font-medium text-foreground/70">
              {data.totalResults} results
            </span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {processedData.queries.map((queryText, idx) => (
            <div
              key={`${queryText}-${idx}`}
              className="flex-shrink-0 rounded-full bg-content3/60 px-3 py-1.5 text-xs text-foreground/70 transition-colors hover:bg-content3/80"
            >
              <MagnifyingGlassIcon className="mr-1.5 inline h-3 w-3" />
              {queryText}
            </div>
          ))}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {processedData.allSources.map((source, idx) => (
            <SourceCard key={`${source.url}-${idx}`} source={source} />
          ))}
        </div>
      </div>
    );
  }, [state, data, processedData]);

  return renderSearchingState || renderResultsState || null;
});

WebSearchDisplay.displayName = "WebSearchDisplay";
