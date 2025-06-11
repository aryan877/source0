"use client";

import { ArrowsRightLeftIcon, CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Button, Tooltip } from "@heroui/react";
import { memo, useCallback, useMemo, useState } from "react";
import Lowlight from "react-lowlight";
import "react-lowlight/common";

interface CodeBlockProps {
  children: string;
  className?: string;
}

const CodeBlock = memo(({ children, className }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);

  const { displayLanguage, highlightLanguage } = useMemo(() => {
    const originalLang = className?.replace("language-", "") || "text";
    const highlightLang = Lowlight.hasLanguage(originalLang) ? originalLang : "text";

    return {
      displayLanguage: originalLang,
      highlightLanguage: highlightLang,
    };
  }, [className]);

  const shouldShowLineNumbers = useMemo(() => {
    return children.split("\n").length > 1;
  }, [children]);

  // Stable copy handler
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [children]);

  // Stable wrap toggle handler
  const handleWrapToggle = useCallback(() => {
    setIsWrapped((prev) => !prev);
  }, []);

  // Memoize line numbers array - only recalculate when children or shouldShowLineNumbers changes
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

  // Memoize header controls to prevent re-renders
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

  // Memoize the syntax highlighting component to prevent unnecessary re-renders
  const syntaxHighlighting = useMemo(
    () => (
      <Lowlight
        language={highlightLanguage}
        value={children}
        inline={false}
        prefix="hljs-"
        markers={[]}
      />
    ),
    [highlightLanguage, children]
  );

  return (
    <div className="not-prose my-3 rounded-md border border-divider bg-content1">
      <div className="flex items-center justify-between border-b border-divider px-3 py-2">
        <span className="font-mono text-xs text-default-600">{displayLanguage}</span>
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
              className={`syntax-highlighting py-3 pl-3 font-mono text-sm leading-6 [&_.hljs-addition]:bg-green-100 [&_.hljs-addition]:text-green-600 [&_.hljs-addition]:dark:bg-green-900/30 [&_.hljs-addition]:dark:text-green-400 [&_.hljs-attr]:text-orange-600 [&_.hljs-attr]:dark:text-orange-400 [&_.hljs-attribute]:text-orange-600 [&_.hljs-attribute]:dark:text-orange-400 [&_.hljs-built_in]:text-purple-600 [&_.hljs-built_in]:dark:text-purple-400 [&_.hljs-class]:text-yellow-600 [&_.hljs-class]:dark:text-yellow-400 [&_.hljs-comment]:italic [&_.hljs-comment]:text-gray-500 [&_.hljs-comment]:dark:text-gray-400 [&_.hljs-deletion]:bg-red-100 [&_.hljs-deletion]:text-red-600 [&_.hljs-deletion]:dark:bg-red-900/30 [&_.hljs-deletion]:dark:text-red-400 [&_.hljs-doctag]:text-purple-600 [&_.hljs-doctag]:dark:text-purple-400 [&_.hljs-emphasis]:italic [&_.hljs-function]:font-semibold [&_.hljs-function]:text-blue-600 [&_.hljs-function]:dark:text-blue-400 [&_.hljs-keyword]:font-semibold [&_.hljs-keyword]:text-purple-600 [&_.hljs-keyword]:dark:text-purple-400 [&_.hljs-literal]:text-blue-600 [&_.hljs-literal]:dark:text-blue-400 [&_.hljs-meta]:text-gray-600 [&_.hljs-meta]:dark:text-gray-400 [&_.hljs-name]:text-red-600 [&_.hljs-name]:dark:text-red-400 [&_.hljs-number]:text-blue-600 [&_.hljs-number]:dark:text-blue-400 [&_.hljs-operator]:text-gray-700 [&_.hljs-operator]:dark:text-gray-300 [&_.hljs-punctuation]:text-gray-600 [&_.hljs-punctuation]:dark:text-gray-400 [&_.hljs-quote]:italic [&_.hljs-quote]:text-gray-500 [&_.hljs-quote]:dark:text-gray-400 [&_.hljs-regexp]:text-green-600 [&_.hljs-regexp]:dark:text-green-400 [&_.hljs-selector-class]:text-yellow-600 [&_.hljs-selector-class]:dark:text-yellow-400 [&_.hljs-selector-id]:text-blue-600 [&_.hljs-selector-id]:dark:text-blue-400 [&_.hljs-selector-tag]:text-red-600 [&_.hljs-selector-tag]:dark:text-red-400 [&_.hljs-string]:text-green-600 [&_.hljs-string]:dark:text-green-400 [&_.hljs-strong]:font-bold [&_.hljs-symbol]:text-indigo-600 [&_.hljs-symbol]:dark:text-indigo-400 [&_.hljs-tag]:text-red-600 [&_.hljs-tag]:dark:text-red-400 [&_.hljs-title]:font-semibold [&_.hljs-title]:text-blue-600 [&_.hljs-title]:dark:text-blue-400 [&_.hljs-type]:text-cyan-600 [&_.hljs-type]:dark:text-cyan-400 [&_.hljs-variable]:text-red-600 [&_.hljs-variable]:dark:text-red-400 [&_pre]:leading-6 ${
                isWrapped
                  ? "whitespace-pre-wrap [&>*]:whitespace-pre-wrap [&_code]:whitespace-pre-wrap [&_pre]:whitespace-pre-wrap"
                  : "whitespace-pre [&>*]:whitespace-pre [&_code]:whitespace-pre [&_pre]:whitespace-pre"
              }`}
            >
              {syntaxHighlighting}
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
