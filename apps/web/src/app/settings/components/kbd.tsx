import React from "react";

export const Kbd = ({ children }: { children: React.ReactNode }) => {
  const isMac = typeof window !== "undefined" ? /Mac/i.test(window.navigator.platform) : false;
  const symbol =
    typeof children === "string"
      ? {
          "⌘": isMac,
          Ctrl: !isMac,
        }[children]
        ? "⌘"
        : !isMac && children === "⌘"
          ? "Ctrl"
          : children
      : children;

  if ((children === "⌘" && !isMac) || (children === "Ctrl" && isMac)) {
    return null;
  }

  return (
    <kbd className="rounded-md border border-divider bg-content2 px-2.5 py-1.5 text-xs font-semibold">
      {symbol}
    </kbd>
  );
};
