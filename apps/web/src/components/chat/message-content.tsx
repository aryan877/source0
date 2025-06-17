"use client";

import type { TavilySearchResult } from "@/types/web-search";
import { Chip, Tooltip } from "@heroui/react";
import "katex/dist/katex.min.css";
import React, { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CodeBlock } from "./code-block";

interface MessageContentProps {
  content: string;
  citations?: TavilySearchResult[];
}

/**
 * Extract text content from React children safely
 */
const extractTextContent = (node: React.ReactNode): string => {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextContent).join("");
  if (
    React.isValidElement(node) &&
    node.props &&
    typeof node.props === "object" &&
    "children" in node.props
  ) {
    return extractTextContent((node.props as { children: React.ReactNode }).children);
  }
  return "";
};

/**
 * Citation component using HeroUI
 */
const CitationPill = memo(
  ({ number, citation }: { number: number; citation: TavilySearchResult }) => (
    <Tooltip
      content={
        <div className="max-w-xs space-y-2 p-1">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://www.google.com/s2/favicons?domain=${new URL(citation.url).hostname}&sz=32`}
              alt=""
              width={16}
              height={16}
              className="flex-shrink-0 rounded-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="truncate text-xs font-medium text-foreground/80">
              {new URL(citation.url).hostname}
            </span>
          </div>
          <p className="text-sm font-semibold leading-snug text-foreground">{citation.title}</p>
          {citation.content && (
            <p className="line-clamp-3 text-xs text-foreground/60">{citation.content}</p>
          )}
        </div>
      }
      placement="top"
      delay={300}
    >
      <Chip
        as="a"
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
        variant="flat"
        color="primary"
        className="mx-0.5 cursor-pointer transition-transform hover:scale-105"
      >
        {number}
      </Chip>
    </Tooltip>
  )
);

CitationPill.displayName = "CitationPill";

/**
 * Custom component to handle citations within markdown
 */
const CitationRenderer = memo(
  ({ children, citations }: { children: React.ReactNode; citations?: TavilySearchResult[] }) => {
    if (!citations || citations.length === 0) {
      return <>{children}</>;
    }

    // Extract text content safely from React children
    const textContent = extractTextContent(children);

    // If it's not a string or is empty, return as-is
    if (typeof textContent !== "string" || !textContent.trim()) {
      return <>{children}</>;
    }

    // Parse citations in the text and replace with components
    const citationRegex = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(textContent)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push(textContent.slice(lastIndex, match.index));
      }

      // Parse citation numbers
      const citationNumbers = match[1];
      if (!citationNumbers) continue;

      const numbers = citationNumbers
        .split(",")
        .map((n: string) => parseInt(n.trim(), 10))
        .filter((n: number) => !isNaN(n) && n > 0 && n <= citations.length);

      if (numbers.length > 0) {
        // Add citation pills
        parts.push(
          <span key={match.index} className="inline-flex items-center gap-1">
            {numbers.map((num) => {
              const citation = citations[num - 1];
              if (!citation) return null;
              return <CitationPill key={num} number={num} citation={citation} />;
            })}
          </span>
        );
      } else {
        // If citation numbers are invalid, keep original text
        parts.push(match[0]);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < textContent.length) {
      parts.push(textContent.slice(lastIndex));
    }

    return <>{parts}</>;
  }
);

CitationRenderer.displayName = "CitationRenderer";

const MessageContent = memo(({ content, citations }: MessageContentProps) => {
  const components: Components = useMemo(
    () => ({
      // Handle text-containing elements with citation processing
      p: ({ children }) => (
        <p>
          <CitationRenderer citations={citations}>{children}</CitationRenderer>
        </p>
      ),
      li: ({ children }) => (
        <li>
          <CitationRenderer citations={citations}>{children}</CitationRenderer>
        </li>
      ),
      span: ({ children }) => (
        <span>
          <CitationRenderer citations={citations}>{children}</CitationRenderer>
        </span>
      ),
      strong: ({ children }) => (
        <strong>
          <CitationRenderer citations={citations}>{children}</CitationRenderer>
        </strong>
      ),
      em: ({ children }) => (
        <em>
          <CitationRenderer citations={citations}>{children}</CitationRenderer>
        </em>
      ),
      // Code block handling
      code: ({ className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || "");
        const isInline = !match;

        if (isInline) {
          return (
            <code className={className} {...props}>
              <CitationRenderer citations={citations}>{children}</CitationRenderer>
            </code>
          );
        }

        return <CodeBlock className={className}>{extractTextContent(children)}</CodeBlock>;
      },
    }),
    [citations]
  );

  const sanitizeSchema = useMemo(
    () => ({
      tagNames: [
        // Basic HTML tags
        "p",
        "br",
        "strong",
        "em",
        "u",
        "s",
        "del",
        "ins",
        "sub",
        "sup",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "dl",
        "dt",
        "dd",
        "blockquote",
        "pre",
        "code",
        "hr",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "a",
        "img",
        // Allow span for citations
        "span",
      ],
      attributes: {
        "*": ["className", "style"],
        a: ["href", "target", "rel"],
        img: ["src", "alt", "width", "height"],
        code: ["className"],
        span: ["className"],
      },
    }),
    []
  );

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MessageContent.displayName = "MessageContent";

export { MessageContent };
export type { MessageContentProps };
