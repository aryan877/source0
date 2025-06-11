"use client";

import "katex/dist/katex.min.css";
import { memo, useMemo } from "react";
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
}

const MessageContent = memo(({ content }: MessageContentProps) => {
  // Memoize the markdown components to prevent recreation
  const components: Components = useMemo(
    () => ({
      pre: ({ children, ...props }) => {
        const codeElement = Array.isArray(children) ? children[0] : children;

        if (codeElement && typeof codeElement === "object" && "props" in codeElement) {
          const codeProps = codeElement.props;
          const className = codeProps.className || "";
          const codeContent = String(codeProps.children || "");

          if (className.startsWith("language-")) {
            return <CodeBlock className={className}>{codeContent}</CodeBlock>;
          }
        }

        return <pre {...props}>{children}</pre>;
      },

      code: ({ children, className, ...props }) => {
        if (!className?.startsWith("language-")) {
          return (
            <code
              className="rounded bg-default-100 px-1.5 py-0.5 font-mono text-sm text-default-800 dark:bg-default-200 dark:text-default-800"
              {...props}
            >
              {children}
            </code>
          );
        }
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    }),
    []
  );

  return (
    <div className="prose prose-base prose-slate max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeRaw, rehypeKatex, rehypeSanitize]}
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
