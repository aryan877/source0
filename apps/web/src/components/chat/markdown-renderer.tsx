"use client";

import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { type ToolTypes } from "@/types/custom-ui-message";
import { addToast, Button, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Tooltip, useDisclosure } from "@heroui/react";
import "katex/dist/katex.min.css";
import { AlertTriangle, ChevronDown, Copy, Download, ExternalLink, FileText, Maximize2 } from "lucide-react";
import React, { memo, useCallback, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { PluggableList } from "unified";
import { CodeBlock } from "./code-block";

/**
 * Preprocesses markdown content to fix common formatting issues before rendering.
 * Handles LLM output inconsistencies and standardizes math delimiters for KaTeX.
 */
const preprocessMarkdownContent = (content: string): string => {
  // Minimal preprocessing - let rehype-katex handle the math properly
  let processed = content;
  
  // Only escape dollar signs in currency amounts to prevent false KaTeX rendering
  processed = processed.replace(/(?<![\\$=])\$(\d+(?:\.\d+)?(?:\s*(?:million|billion|trillion|k|K|M|B|T))?)\b(?![^$]*\$)/g, "\\$$1");
  
  // Fix any double-escaped markdown characters
  processed = processed.replace(/\\\\([*_`~])/g, "\\$1");

  return processed;
};

interface MarkdownRendererProps {
  content: string;
  citations?: ToolTypes["webSearch"]["output"]["searchResults"][number]["results"][number][];
  isUser?: boolean;
}

/**
 * Citation component using HeroUI
 */
const CitationPill = memo(
  ({ number, citation }: { number: number; citation: ToolTypes["webSearch"]["output"]["searchResults"][number]["results"][number] }) => (
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
 * Link Warning Modal Component
 */
const LinkWarningModal = memo(
  ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    url 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void; 
    url: string;
  }) => (
    <Modal isOpen={isOpen} onClose={onClose} size="md" backdrop="opaque">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span>External Link Warning</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-3">
                <p className="text-foreground/80">
                  You are about to visit an external website. Please be aware that:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-foreground/70 ml-4">
                  <li>This link has not been verified for safety</li>
                  <li>The content may not be related to our conversation</li>
                  <li>External sites may have different privacy policies</li>
                </ul>
                <div className="p-3 bg-content2 rounded-lg break-all">
                  <div className="flex items-center gap-2 mb-1">
                    <ExternalLink className="h-4 w-4 text-foreground/60" />
                    <span className="text-xs font-medium text-foreground/60">DESTINATION:</span>
                  </div>
                  <span className="text-sm text-foreground">{url}</span>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button color="primary" onPress={onConfirm}>
                Continue to Site
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
);

LinkWarningModal.displayName = "LinkWarningModal";

/**
 * A recursive renderer that processes citations in text nodes while preserving nested React components.
 */
const RecursiveCitationRenderer = memo(
  ({ children, citations }: { children: React.ReactNode; citations?: ToolTypes["webSearch"]["output"]["searchResults"][number]["results"][number][] }) => {
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

// Enhanced KaTeX configuration based on 2025 best practices with expanded mathematical support
const katexOptions = {
  // Security settings to prevent XSS (CVE-2025-23207)
  throwOnError: false, // Don't crash on malformed math - show error in red instead
  errorColor: '#ef4444', // Tailwind red-500 for better theme integration
  strict: 'warn' as const, // Warn on deprecated features but don't break
  trust: false, // CRITICAL: Disable \htmlData, \href, \includegraphics and other HTML commands
  
  // Performance and resource limits
  maxSize: 15, // Increased limit for complex expressions
  maxExpand: 2000, // Higher limit for macro expansions to support advanced math
  
  // Display options for better rendering
  fleqn: false, // Don't left-align equations (center-align looks better)
  displayMode: false, // Default to inline mode (overridden by $$)
  output: 'html' as const, // Use HTML output (not MathML) for better compatibility
  
  // Enhanced macro library for comprehensive mathematical notation
  macros: {
    // Number sets (blackboard bold)
    "\\RR": "\\mathbb{R}",
    "\\NN": "\\mathbb{N}",
    "\\ZZ": "\\mathbb{Z}",
    "\\QQ": "\\mathbb{Q}",
    "\\CC": "\\mathbb{C}",
    "\\FF": "\\mathbb{F}",
    "\\PP": "\\mathbb{P}",
    
    // Common operators and functions
    "\\argmin": "\\operatorname{argmin}",
    "\\argmax": "\\operatorname{argmax}",
    "\\minimize": "\\operatorname{minimize}",
    "\\maximize": "\\operatorname{maximize}",
    "\\subjectto": "\\operatorname{subject\\,to}",
    "\\Tr": "\\operatorname{Tr}",
    "\\rank": "\\operatorname{rank}",
    "\\span": "\\operatorname{span}",
    "\\dim": "\\operatorname{dim}",
    "\\ker": "\\operatorname{ker}",
    "\\img": "\\operatorname{img}",
    "\\diag": "\\operatorname{diag}",
    
    // Probability and statistics
    "\\Var": "\\operatorname{Var}",
    "\\Cov": "\\operatorname{Cov}",
    "\\Corr": "\\operatorname{Corr}",
    "\\Exp": "\\operatorname{E}",
    "\\Prob": "\\operatorname{P}",
    
    
    // Machine learning common notation
    "\\softmax": "\\operatorname{softmax}",
    "\\sigmoid": "\\operatorname{sigmoid}",
    "\\relu": "\\operatorname{ReLU}",
    "\\tanh": "\\operatorname{tanh}",
  }
};

const rehypePlugins: PluggableList = [
  rehypeRaw, 
  [rehypeSanitize, sanitizeSchema], 
  [rehypeKatex, katexOptions]
];

/**
 * Enhanced table renderer with row expansion and export functionality
 */
const TableRenderer = memo(({ children }: { children: React.ReactNode }) => {
  const [isRowsExpanded, setIsRowsExpanded] = useState(false);
  
  // Extract table data for export
  const extractTableData = useCallback(() => {
    const tableElement = document.querySelector('table');
    if (!tableElement) return { headers: [], rows: [] };
    
    const headers: string[] = [];
    const rows: string[][] = [];
    
    // Extract headers
    const headerCells = tableElement.querySelectorAll('thead th');
    headerCells.forEach(cell => {
      headers.push(cell.textContent?.trim() || '');
    });
    
    // Extract rows
    const bodyRows = tableElement.querySelectorAll('tbody tr');
    bodyRows.forEach(row => {
      const rowData: string[] = [];
      const cells = row.querySelectorAll('td');
      cells.forEach(cell => {
        rowData.push(cell.textContent?.trim() || '');
      });
      rows.push(rowData);
    });
    
    return { headers, rows };
  }, []);
  
  const handleCopyToClipboard = useCallback(async () => {
    const { headers, rows } = extractTableData();
    const tableText = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
    
    try {
      await navigator.clipboard.writeText(tableText);
      addToast({
        title: "Table Copied",
        description: "Table data has been copied to clipboard",
        color: "success",
      });
    } catch {
      addToast({
        title: "Copy Failed",
        description: "Failed to copy table to clipboard",
        color: "danger",
      });
    }
  }, [extractTableData]);
  
  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);
  
  const handleExportCSV = useCallback(() => {
    const { headers, rows } = extractTableData();
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
    downloadFile(csvContent, 'table.csv', 'text/csv');
    addToast({
      title: "CSV Downloaded",
      description: "Table exported as CSV file",
      color: "success",
    });
  }, [extractTableData, downloadFile]);
  
  const handleExportMarkdown = useCallback(() => {
    const { headers, rows } = extractTableData();
    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
    const dataRows = rows.map(row => `| ${row.join(' | ')} |`);
    const markdownContent = [headerRow, separatorRow, ...dataRows].join('\n');
    downloadFile(markdownContent, 'table.md', 'text/markdown');
    addToast({
      title: "Markdown Downloaded",
      description: "Table exported as Markdown file",
      color: "success",
    });
  }, [extractTableData, downloadFile]);
  
  return (
    <TableContext.Provider value={{ isRowsExpanded }}>
      <div className="my-8 not-prose">
        <div className="rounded-2xl border border-divider/60 bg-content1/50 backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full table-auto border-collapse">
              {children}
            </table>
          </div>
        </div>
      
      {/* Table Actions Below */}
      <div className="flex items-center justify-between mt-3 px-2">
        <div className="flex items-center gap-2">
          <Tooltip content={isRowsExpanded ? "Collapse rows" : "Expand rows"}>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="bg-content2/60 text-foreground/60 hover:bg-content3/80"
              onPress={() => setIsRowsExpanded(!isRowsExpanded)}
            >
              <Maximize2 className={`w-4 h-4 transition-transform ${isRowsExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </Tooltip>
          
          <Dropdown>
            <DropdownTrigger>
              <Button
                size="sm"
                variant="light"
                className="bg-content2/60 text-foreground/60 hover:bg-content3/80 px-3"
                endContent={<ChevronDown className="w-3 h-3" />}
              >
                <Download className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem key="csv" onPress={handleExportCSV}>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Export as CSV
                </div>
              </DropdownItem>
              <DropdownItem key="markdown" onPress={handleExportMarkdown}>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Export as Markdown
                </div>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>

          <Tooltip content="Copy table to clipboard">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="bg-content2/60 text-foreground/60 hover:bg-content3/80"
              onPress={handleCopyToClipboard}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
      </div>
    </TableContext.Provider>
  );
});

TableRenderer.displayName = "TableRenderer";

// Table context for row expansion state
const TableContext = React.createContext<{ isRowsExpanded: boolean }>({ isRowsExpanded: false });

// Table cell component to handle row expansion
const TableCell = memo(({ children, citations, ...props }: { children: React.ReactNode; citations?: ToolTypes["webSearch"]["output"]["searchResults"][number]["results"][number][] } & React.TdHTMLAttributes<HTMLTableCellElement>) => {
  const { isRowsExpanded } = React.useContext(TableContext);
  return (
    <td {...props} className="px-6 py-4 text-sm text-foreground/90 leading-normal align-top group-hover:text-foreground transition-colors duration-300">
      <div className={!isRowsExpanded ? "line-clamp-3 max-h-20 overflow-hidden" : ""}>
        <RecursiveCitationRenderer citations={citations}>{children}</RecursiveCitationRenderer>
      </div>
    </td>
  );
});

TableCell.displayName = "TableCell";

const MarkdownRenderer = memo(({ content, citations }: MarkdownRendererProps) => {
  const { fontSize } = useUserPreferencesStore();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const processedContent = useMemo(() => preprocessMarkdownContent(content), [content]);

  const handleLinkClick = useCallback((url: string) => {
    setPendingUrl(url);
    onOpen();
  }, [onOpen]);

  const handleConfirmNavigation = useCallback(() => {
    if (pendingUrl) {
      window.open(pendingUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
    setPendingUrl(null);
  }, [pendingUrl, onClose]);

  const handleCloseModal = useCallback(() => {
    onClose();
    setPendingUrl(null);
  }, [onClose]);

  const CitationWrapper = useMemo(() => {
    const Component = ({ children }: { children: React.ReactNode }) => (
      <RecursiveCitationRenderer citations={citations}>{children}</RecursiveCitationRenderer>
    );
    Component.displayName = "CitationWrapper";
    return Component;
  }, [citations]);

  const components: Components = useMemo(
    () => ({
      p: ({ children }) => (
        <p><CitationWrapper>{children}</CitationWrapper></p>
      ),
      li: ({ children }) => (
        <li><CitationWrapper>{children}</CitationWrapper></li>
      ),
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
      table: ({ children }) => {
        return <TableRenderer>{children}</TableRenderer>;
      },
      thead: ({ children, ...props }) => {
        return (
          <thead {...props} className="bg-gradient-to-r from-content2/90 to-content3/70 backdrop-blur-md">
            {children}
          </thead>
        );
      },
      tbody: ({ children, ...props }) => {
        return (
          <tbody {...props} className="divide-y divide-divider/40">
            {children}
          </tbody>
        );
      },
      tr: ({ children, ...props }) => {
        return (
          <tr {...props} className="group transition-all duration-300 hover:bg-gradient-to-r hover:from-primary/8 hover:to-secondary/8 hover:shadow-sm">
            {children}
          </tr>
        );
      },
      th: ({ children, ...props }) => (
        <th {...props} className="px-6 py-4 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider border-b-2 border-primary/20 sticky top-0 bg-content2/95 backdrop-blur-md relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-primary/5 before:to-transparent">
          <div className="relative z-10">
            <CitationWrapper>{children}</CitationWrapper>
          </div>
        </th>
      ),
      td: ({ children, ...props }) => (
        <TableCell citations={citations} {...props}>{children}</TableCell>
      ),
      a: ({ href, children, className, ...props }) => {
        // Handle mailto, tel, and fragment links normally
        if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
          return (
            <a href={href} className={className || "text-primary hover:text-primary/80 underline"} {...props}>
              {children}
            </a>
          );
        }

        // For external links, show warning modal
        return (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick(href);
            }}
            className={`text-primary hover:text-primary/80 underline cursor-pointer inline-flex items-center gap-1 ${className || ''}`}
          >
            {children}
            <ExternalLink className="h-3 w-3 opacity-70" />
          </button>
        );
      },
    }),
    [citations, handleLinkClick, CitationWrapper]
  );

  const proseClassName = useMemo(() => `prose max-w-none prose-${fontSize}`, [fontSize]);

  const proseStyle = useMemo<React.CSSProperties>(() => {
    const mappedFontSize =
      fontSize === "xs"
        ? "0.75rem"
        : fontSize === "sm"
          ? "0.875rem"
          : fontSize === "base"
            ? "1rem"
            : fontSize === "lg"
              ? "1.125rem"
              : "1.25rem";

    return {
      fontSize: mappedFontSize,
      // Isolate markdown reflows so pinch-zoom resize events don't trigger
      // unnecessary paints higher up the tree.
      contain: "layout paint",
    };
  }, [fontSize]);

  return (
    <>
      <div className={proseClassName} style={proseStyle}>
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={components}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
      
      <LinkWarningModal
        isOpen={isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmNavigation}
        url={pendingUrl || ''}
      />
    </>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";

export { MarkdownRenderer };
export type { MarkdownRendererProps };
