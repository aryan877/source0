"use client";

import { ArrowsRightLeftIcon, CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Button, Tooltip } from "@heroui/react";
import { transformerNotationDiff, transformerNotationHighlight } from "@shikijs/transformers";
import { useTheme } from "next-themes";
import { memo, useCallback, useMemo, useState } from "react";
import ShikiHighlighter from "react-shiki";
import { bundledLanguages } from "shiki";

interface CodeBlockProps {
  children: string;
  className?: string;
}

const CodeBlock = memo(({ children, className }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const { resolvedTheme } = useTheme();

  const language = useMemo(() => {
    return className?.replace("language-", "") || "text";
  }, [className]);

  const code = useMemo(() => {
    return children.trim();
  }, [children]);

  // Check if the language is supported by checking against the bundled languages.
  const isLanguageSupported = useMemo(() => {
    return (Object.keys(bundledLanguages) as string[]).includes(language);
  }, [language]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [code]);

  const handleWrapToggle = useCallback(() => {
    setIsWrapped((prev) => !prev);
  }, []);

  const lineCount = useMemo(() => {
    const lines = code.split("\n");
    return lines.length;
  }, [code]);

  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  }, [lineCount]);

  const headerControls = useMemo(
    () => (
      <div className="flex items-center gap-1">
        <Tooltip content={isWrapped ? "Unwrap code" : "Wrap code"} placement="top" delay={300}>
          <div>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onPress={handleWrapToggle}
              className={`h-6 w-6 transition-colors ${isWrapped ? "bg-content2" : ""}`}
              aria-pressed={isWrapped}
            >
              <div className={`transition-transform duration-200 ${isWrapped ? "rotate-90" : ""}`}>
                <ArrowsRightLeftIcon className="h-3 w-3" />
              </div>
            </Button>
          </div>
        </Tooltip>
        <Tooltip content={copied ? "Copied!" : "Copy"} placement="top" delay={300}>
          <div>
            <Button size="sm" variant="light" isIconOnly onPress={handleCopy} className="h-6 w-6">
              {copied ? (
                <CheckIcon className="h-3 w-3 text-success" />
              ) : (
                <ClipboardDocumentIcon className="h-3 w-3" />
              )}
            </Button>
          </div>
        </Tooltip>
      </div>
    ),
    [isWrapped, handleWrapToggle, copied, handleCopy]
  );

  // Fallback component for plain text rendering
  const FallbackCodeBlock = useMemo(
    () => (
      <div className="px-3 py-3 font-mono text-sm leading-6">
        <pre
          className={`m-0 bg-transparent p-0 text-foreground ${
            isWrapped
              ? "overflow-hidden whitespace-pre-wrap break-words"
              : "overflow-x-auto whitespace-pre"
          }`}
        >
          {code}
        </pre>
      </div>
    ),
    [code, isWrapped]
  );

  if (!code) {
    return null;
  }

  return (
    <div className="not-prose my-3 rounded-md border border-divider bg-content1">
      <div className="flex items-center justify-between border-b border-divider px-3 py-2">
        <span className="font-mono text-xs text-default-600">
          {language}
          {!isLanguageSupported && " (no highlighting)"}
        </span>
        {headerControls}
      </div>
      <div className={`${isWrapped ? "overflow-x-visible" : "overflow-x-auto"}`}>
        <div className={`flex ${isWrapped ? "min-w-0" : "min-w-max"}`}>
          {/* Line Numbers Column */}
          <div className="flex min-w-[3rem] select-none flex-col rounded-bl-md border-r border-divider bg-default-50 px-3 py-3">
            {lineNumbers.map((lineNum) => (
              <div
                key={lineNum}
                className="flex h-6 items-center justify-end font-mono text-xs leading-6 text-default-400"
              >
                {lineNum}
              </div>
            ))}
          </div>
          {/* Code Column */}
          <div className="min-w-0 flex-1">
            {isLanguageSupported ? (
              <div className="px-3 py-3 font-mono text-sm leading-6 [&>pre]:!m-0 [&>pre]:!bg-transparent [&>pre]:!p-0 [&_.shiki>pre]:!bg-transparent [&_.shiki]:!bg-transparent">
                <ShikiHighlighter
                  theme={resolvedTheme === "dark" ? "github-dark" : "github-light"}
                  language={language}
                  delay={100}
                  transformers={[transformerNotationDiff(), transformerNotationHighlight()]}
                  className={`${
                    isWrapped
                      ? "[&>pre]:overflow-hidden [&>pre]:whitespace-pre-wrap [&>pre]:break-words"
                      : "[&>pre]:overflow-x-auto [&>pre]:whitespace-pre"
                  } [&>pre]:!m-0 [&>pre]:!bg-transparent [&>pre]:!p-0`}
                >
                  {code}
                </ShikiHighlighter>
              </div>
            ) : (
              FallbackCodeBlock
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

export { CodeBlock };
export type { CodeBlockProps };
