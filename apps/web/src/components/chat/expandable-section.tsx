"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { memo, useCallback, useMemo, useState } from "react";

interface ExpandableSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  variant?: "reasoning" | "tool" | "source" | "default";
}

const ExpandableSection = memo(
  ({
    title,
    icon,
    children,
    defaultExpanded = false,
    variant = "default",
  }: ExpandableSectionProps) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const handleToggle = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    const variantStyles = useMemo(() => {
      switch (variant) {
        case "reasoning":
          return "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20";
        case "tool":
          return "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20";
        case "source":
          return "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20";
        default:
          return "border-default-200 bg-content2/30 dark:border-default-700";
      }
    }, [variant]);

    const iconColor = useMemo(() => {
      switch (variant) {
        case "reasoning":
          return "text-amber-600 dark:text-amber-400";
        case "tool":
          return "text-blue-600 dark:text-blue-400";
        case "source":
          return "text-green-600 dark:text-green-400";
        default:
          return "text-default-600 dark:text-default-400";
      }
    }, [variant]);

    return (
      <div
        className={`my-3 overflow-hidden rounded-lg border ${variantStyles} transition-all duration-200`}
      >
        <button
          onClick={handleToggle}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        >
          <div
            className={`flex h-6 w-6 items-center justify-center transition-transform duration-200 ${
              isExpanded ? "" : "-rotate-90"
            } ${iconColor}`}
          >
            {icon}
          </div>
          <span className="flex-1 font-medium text-foreground">{title}</span>
          <div
            className={`flex h-5 w-5 items-center justify-center text-default-500 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <ChevronDownIcon className="h-4 w-4" />
          </div>
        </button>

        {isExpanded && (
          <div className="overflow-hidden">
            <div className="border-t border-divider/50 p-3 pt-3">{children}</div>
          </div>
        )}
      </div>
    );
  }
);

ExpandableSection.displayName = "ExpandableSection";

export { ExpandableSection };
export type { ExpandableSectionProps };
