"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { memo, useCallback, useEffect, useState } from "react";

interface ExpandableSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  variant?: "reasoning" | "tool" | "source" | "default";
  isLoading?: boolean;
  noBg?: boolean;
  autoExpand?: boolean;
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
    noBg = false,
    autoExpand = false,
  }: ExpandableSectionProps) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const handleToggle = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    useEffect(() => {
      if (autoExpand) {
        if (isLoading) {
          setIsExpanded(true);
        } else {
          const timer = setTimeout(() => {
            setIsExpanded(false);
          }, 1500);
          return () => clearTimeout(timer);
        }
      }
    }, [isLoading, autoExpand]);

    return (
      <div className="my-3">
        <button
          onClick={handleToggle}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-content1/50"
        >
          <div className="flex h-3.5 w-3.5 items-center justify-center text-foreground/50">
            {icon}
          </div>

          <span
            className={`flex-1 text-xs font-semibold uppercase tracking-wide text-foreground/60 ${
              isLoading
                ? "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
                : ""
            }`}
          >
            {title}
          </span>

          {isLoading && (
            <div className="mr-2">
              <LoadingSpinner />
            </div>
          )}

          <div
            className={`flex h-3.5 w-3.5 items-center justify-center text-foreground/30 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <ChevronDownIcon className="h-2.5 w-2.5" />
          </div>
        </button>

        <div
          className={`grid transition-all duration-200 ease-in-out ${
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-3 pb-3 pt-1">
              {noBg ? (
                <div className="leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_.prose]:!text-sm">
                  {children}
                </div>
              ) : (
                <div className="rounded-2xl bg-default-100 px-5 py-4 dark:bg-default-50">
                  <div className="leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_.prose]:!text-sm">
                    {children}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ExpandableSection.displayName = "ExpandableSection";

export { ExpandableSection };
export type { ExpandableSectionProps };
