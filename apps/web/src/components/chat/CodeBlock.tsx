"use client";

import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Button, Chip } from "@heroui/react";
import "highlight.js/styles/atom-one-dark.css";
import { memo, startTransition, useCallback, useMemo, useState } from "react";
import Lowlight from "react-lowlight";
import "react-lowlight/common";

interface CodeBlockProps {
  children: string;
  className?: string;
}

const CodeBlock = memo(({ children, className }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const language = useMemo(() => {
    const lang = className?.replace("language-", "") || "text";
    return Lowlight.hasLanguage(lang) ? lang : "text";
  }, [className]);

  const shouldShowLineNumbers = useMemo(() => children.split("\n").length > 1, [children]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      startTransition(() => setCopied(true));
      setTimeout(() => startTransition(() => setCopied(false)), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [children]);

  const lineNumbers = useMemo(() => {
    if (!shouldShowLineNumbers) return null;
    const lines = children.split("\n");
    return lines.map((_, index) => (
      <div
        key={index}
        className="select-none text-right font-mono text-sm text-default-400"
        style={{ lineHeight: "1.5" }}
      >
        {index + 1}
      </div>
    ));
  }, [children, shouldShowLineNumbers]);

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-divider bg-content1">
      <div className="flex items-center justify-between border-b border-divider px-4 py-2">
        <Chip size="sm" variant="flat" className="text-xs">
          {language}
        </Chip>
        <Button size="sm" variant="light" isIconOnly onPress={handleCopy}>
          {copied ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <ClipboardDocumentIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <div className="flex items-start">
          {shouldShowLineNumbers && (
            <div className="flex flex-col border-r border-divider bg-content2/30 px-4 py-4">
              {lineNumbers}
            </div>
          )}
          <div className="flex-1 py-4 pl-4 pr-4">
            <div
              className="syntax-highlighting font-mono text-sm [&>pre]:!m-0 [&>pre]:!p-0 [&_code]:!m-0 [&_code]:!p-0"
              style={{ lineHeight: "1.5" }}
            >
              <Lowlight
                language={language}
                value={children}
                inline={false}
                prefix="hljs-"
                markers={[]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

export default CodeBlock;
