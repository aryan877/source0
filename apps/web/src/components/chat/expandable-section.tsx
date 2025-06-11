"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { memo, useCallback, useState } from "react";

interface ExpandableSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  variant?: "reasoning" | "tool" | "source" | "default";
  isLoading?: boolean;
}

const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center">
    <div className="h-3 w-3 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/60"></div>
  </div>
));

LoadingSpinner.displayName = "LoadingSpinner";

const ExpandableSection = memo(
  ({
    title,
    icon,
    children,
    defaultExpanded = false,
    isLoading = false,
  }: ExpandableSectionProps) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const handleToggle = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    return (
      <div className="my-2">
        <button
          onClick={handleToggle}
          className="flex w-full items-center gap-2 py-2 text-left transition-colors hover:text-foreground/80"
        >
          <div className="flex h-4 w-4 items-center justify-center text-foreground/60">{icon}</div>

          <span className="flex-1 text-sm text-foreground/70">{title}</span>

          {/* Loading spinner - only show when isLoading is true */}
          {isLoading && (
            <div className="mr-2">
              <LoadingSpinner />
            </div>
          )}

          <div
            className={`flex h-4 w-4 items-center justify-center text-foreground/40 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <ChevronDownIcon className="h-3 w-3" />
          </div>
        </button>

        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pb-2 pl-6">{children}</div>
        </div>
      </div>
    );
  }
);

ExpandableSection.displayName = "ExpandableSection";

export { ExpandableSection };
export type { ExpandableSectionProps };
