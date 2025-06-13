"use client";

import { ArrowsRightLeftIcon, CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Button, Tooltip } from "@heroui/react";
import parse from "html-react-parser";
import { useTheme } from "next-themes";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { codeToHtml } from "shiki";

interface CodeBlockProps {
  children: string;
  className?: string;
}

const CodeBlock = memo(({ children, className }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const [error, setError] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState("");
  const { resolvedTheme } = useTheme();

  const language = useMemo(() => {
    return className?.replace("language-", "") || "text";
  }, [className]);

  useEffect(() => {
    let isMounted = true;
    setError(false);
    const highlight = async () => {
      try {
        const html = await codeToHtml(children, {
          lang: language,
          theme: resolvedTheme === "dark" ? "github-dark" : "github-light",
        });
        if (isMounted) {
          setHighlightedCode(html);
        }
      } catch (err) {
        console.error("Failed to highlight code:", err);
        if (isMounted) {
          setError(true);
        }
      }
    };
    highlight();
    return () => {
      isMounted = false;
    };
  }, [children, language, resolvedTheme]);

  const shouldShowLineNumbers = useMemo(() => {
    return children.split("\n").length > 1;
  }, [children]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [children]);

  const handleWrapToggle = useCallback(() => {
    setIsWrapped((prev) => !prev);
  }, []);

  const lineNumbers = useMemo(() => {
    if (!shouldShowLineNumbers) return null;

    const lines = children.split("\n");
    const totalLines = lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;

    return Array.from({ length: totalLines }, (_, index) => (
      <div
        key={index}
        className="flex h-6 items-center justify-end px-2 font-mono text-sm leading-6 text-default-500"
      >
        {index + 1}
      </div>
    ));
  }, [children, shouldShowLineNumbers]);

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

  if (error) {
    return (
      <div className="not-prose my-3 rounded-md border border-divider bg-content1">
        <div className="flex items-center justify-between border-b border-divider px-3 py-2">
          <span className="font-mono text-xs text-default-600">{language} (unsupported)</span>
          {headerControls}
        </div>
        <div className={`${isWrapped ? "overflow-x-visible" : "overflow-x-auto"} px-3`}>
          <div className={`flex ${isWrapped ? "min-w-0" : "min-w-max"}`}>
            {shouldShowLineNumbers && (
              <div className="flex min-w-[2.5rem] flex-col border-r border-divider bg-default-50 py-3">
                {lineNumbers}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <pre className="py-3 pl-3 font-mono text-sm leading-6">{children}</pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="not-prose my-3 rounded-md border border-divider bg-content1">
      <div className="flex items-center justify-between border-b border-divider px-3 py-2">
        <span className="font-mono text-xs text-default-600">{language}</span>
        {headerControls}
      </div>
      <div className={`${isWrapped ? "overflow-x-visible" : "overflow-x-auto"} px-3`}>
        <div className={`flex ${isWrapped ? "min-w-0" : "min-w-max"}`}>
          {shouldShowLineNumbers && (
            <div className="flex min-w-[2.5rem] flex-col border-r border-divider bg-default-50 py-3">
              {lineNumbers}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div
              className={`py-3 pl-3 font-mono text-sm leading-6 ${
                isWrapped
                  ? "[&>pre]:whitespace-pre-wrap [&>pre]:break-all"
                  : "[&>pre]:overflow-x-auto [&>pre]:whitespace-pre"
              } [&>pre]:!m-0 [&>pre]:!bg-transparent [&>pre]:!p-0`}
            >
              {highlightedCode ? parse(highlightedCode) : <pre>{children}</pre>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

export { CodeBlock };
export type { CodeBlockProps };
