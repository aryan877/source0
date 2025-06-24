"use client";

import { themeOptions, useUserPreferencesStore } from "@/stores/user-preferences-store";
import type { TavilySearchResult } from "@/types/web-search";
import { Chip, Tooltip } from "@heroui/react";
import "katex/dist/katex.min.css";
import { useTheme } from "next-themes";
import React, { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { PluggableList } from "unified";
import { CodeBlock } from "./code-block";

interface MessageContentProps {
  content: string;
  citations?: TavilySearchResult[];
  isUser?: boolean;
}

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
 * A recursive renderer that processes citations in text nodes while preserving nested React components.
 */
const RecursiveCitationRenderer = memo(
  ({ children, citations }: { children: React.ReactNode; citations?: TavilySearchResult[] }) => {
    if (!citations || citations.length === 0) {
      return <>{children}</>;
    }

    const citationRegex = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

    const isCodeContext = (node: React.ReactNode): boolean => {
      if (React.isValidElement(node)) {
        const element = node as React.ReactElement<{
          className?: string;
          children?: React.ReactNode;
        }>;
        // Check if this is a code element or has code-related classes
        const isCode =
          element.type === "code" ||
          element.type === "pre" ||
          (typeof element.props.className === "string" &&
            element.props.className.includes("language-"));

        return isCode;
      }
      return false;
    };

    const processNode = (
      node: React.ReactNode,
      skipCitations = false,
      depth = 0
    ): React.ReactNode => {
      if (typeof node === "string") {
        // Skip citation processing if we're in a code context
        if (skipCitations) {
          return node;
        }

        if (!citationRegex.test(node)) {
          return node;
        }
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        citationRegex.lastIndex = 0;

        while ((match = citationRegex.exec(node)) !== null) {
          if (match.index > lastIndex) {
            parts.push(node.slice(lastIndex, match.index));
          }

          const citationNumbers = match[1];
          if (!citationNumbers) {
            parts.push(match[0]);
            lastIndex = match.index + match[0].length;
            continue;
          }

          const numbers = citationNumbers
            .split(",")
            .map((n: string) => parseInt(n.trim(), 10))
            .filter((n: number) => !isNaN(n) && n > 0 && n <= citations.length);

          if (numbers.length > 0) {
            parts.push(
              <span
                key={`${match.index}-${numbers.join()}`}
                className="inline-flex items-center gap-1"
              >
                {numbers.map((num) => {
                  const citation = citations[num - 1];
                  if (!citation) return null;
                  return <CitationPill key={num} number={num} citation={citation} />;
                })}
              </span>
            );
          } else {
            parts.push(match[0]);
          }

          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < node.length) {
          parts.push(node.slice(lastIndex));
        }

        return parts;
      }

      if (Array.isArray(node)) {
        return node.map((child, i) => (
          <React.Fragment key={i}>{processNode(child, skipCitations, depth + 1)}</React.Fragment>
        ));
      }

      if (React.isValidElement(node)) {
        const element = node as React.ReactElement<{
          children?: React.ReactNode;
          className?: string;
        }>;

        const isCodeElement = ["a", "pre", "code"].includes(element.type as string);
        const isCodeCtx = isCodeContext(element);

        // Skip processing for code-related elements completely
        if (isCodeElement || isCodeCtx) {
          return element;
        }

        // Only process if the element has children
        if (element.props.children !== undefined) {
          return React.cloneElement(element, {
            ...element.props,
            children: processNode(element.props.children, skipCitations, depth + 1),
          });
        }
      }

      return node;
    };

    const result = processNode(children);
    return <>{result}</>;
  }
);

RecursiveCitationRenderer.displayName = "RecursiveCitationRenderer";

const remarkPlugins = [remarkGfm, remarkMath, remarkBreaks];

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), ["className", /^language-./]],
    span: [
      ...(defaultSchema.attributes?.span || []),
      ["className", /^(hljs-|shiki|line|katex|katex-display|mord|vlist|pstrut|strut|base)/],
      "style",
    ],
    div: [...(defaultSchema.attributes?.div || []), "className", "style"],
    pre: [...(defaultSchema.attributes?.pre || []), "className"],
  },
};

const rehypePlugins: PluggableList = [rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeKatex];

const MessageContent = memo(({ content, citations, isUser }: MessageContentProps) => {
  const { fontSize } = useUserPreferencesStore();
  const { theme } = useTheme();

  const isDarkTheme = useMemo(() => {
    const themeOption = themeOptions.find((opt) => opt.key === theme);
    return themeOption?.base === "dark";
  }, [theme]);

  const components: Components = useMemo(
    () => ({
      p: ({ children }) => {
        return (
          <p>
            <RecursiveCitationRenderer citations={citations}>{children}</RecursiveCitationRenderer>
          </p>
        );
      },
      li: ({ children }) => {
        return (
          <li>
            <RecursiveCitationRenderer citations={citations}>{children}</RecursiveCitationRenderer>
          </li>
        );
      },
      code: ({ className, children, ...props }) => {
        // For inline code, render a normal <code> tag.
        // For block-level code, the <pre> wrapper will handle rendering.
        if (!className?.startsWith("language-")) {
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
        // For block-level code, we return the children directly.
        // The `pre` component will wrap this in a CodeBlock.
        return <>{children}</>;
      },
      pre: ({ children, ...props }) => {
        if (
          React.isValidElement(children) &&
          (children.type === "code" ||
            ((children.props as { className?: string }).className &&
              (children.props as { className?: string }).className!.startsWith("language-")))
        ) {
          const codeProps = (children as React.ReactElement).props as {
            className?: string;
            children?: React.ReactNode;
          };
          const languageClassName = codeProps.className || "";
          const codeContent = String(codeProps.children).replace(/\n$/, "");

          return (
            <div className="text-left">
              <CodeBlock className={languageClassName}>{codeContent}</CodeBlock>
            </div>
          );
        }

        return (
          <pre {...props} className="text-left">
            {children}
          </pre>
        );
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div
      className={`prose max-w-none prose-${fontSize} ${isDarkTheme ? "prose-invert" : ""}`}
      style={{
        // Correctly map the abstract size to a pixel value for the container.
        // Tailwind's prose plugin uses this to scale all children.
        fontSize:
          fontSize === "xs"
            ? "0.75rem"
            : fontSize === "sm"
              ? "0.875rem"
              : fontSize === "base"
                ? "1rem"
                : fontSize === "lg"
                  ? "1.125rem"
                  : "1.25rem",
      }}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
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
