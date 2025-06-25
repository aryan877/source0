"use client";

import { themeColorMap, themeOptions } from "@/stores/user-preferences-store";
import { Tooltip } from "@heroui/react";
import { useTheme } from "next-themes";
import { memo, useCallback, useEffect, useState } from "react";

const ThemeSelector = memo(() => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = useCallback(
    (newTheme: string) => {
      setTheme(newTheme);
    },
    [setTheme]
  );

  const currentTheme = resolvedTheme || theme || "lavender";

  if (!mounted) {
    return (
      <div className="flex items-center gap-1.5 p-1">
        {themeOptions.slice(0, 4).map((theme) => (
          <div
            key={theme.key}
            className="h-6 w-6 rounded-full opacity-50"
            style={{ backgroundColor: themeColorMap[theme.key][0] }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 p-1">
      {themeOptions.map((theme) => (
        <Tooltip key={theme.key} content={theme.label} placement="top" delay={500}>
          <button
            onClick={() => handleThemeChange(theme.key)}
            className={`relative h-6 w-6 rounded-full border-2 transition-all hover:scale-110 ${
              currentTheme === theme.key
                ? "border-default-900 shadow-sm"
                : "border-transparent hover:border-default-300"
            }`}
            style={{ backgroundColor: themeColorMap[theme.key][0] }}
          >
            {currentTheme === theme.key && (
              <div className="absolute inset-0.5 rounded-full bg-white/30 backdrop-blur-sm" />
            )}
          </button>
        </Tooltip>
      ))}
    </div>
  );
});

ThemeSelector.displayName = "ThemeSelector";

export { ThemeSelector };
