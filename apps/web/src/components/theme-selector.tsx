"use client";

import { themeColorMap, themeOptions } from "@/stores/user-preferences-store";
import { Select, SelectItem } from "@heroui/react";
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
      <Select
        size="sm"
        placeholder="Theme"
        isDisabled
        aria-label="Theme selector"
        classNames={{
          trigger: "h-8 min-h-unit-8",
        }}
      >
        {themeOptions.map((theme) => (
          <SelectItem
            key={theme.key}
            startContent={
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: themeColorMap[theme.key][0] }}
              />
            }
          >
            {theme.label}
          </SelectItem>
        ))}
      </Select>
    );
  }

  return (
    <Select
      size="sm"
      selectedKeys={[currentTheme]}
      onSelectionChange={(keys) => {
        const selectedTheme = Array.from(keys)[0] as string;
        if (selectedTheme) {
          handleThemeChange(selectedTheme);
        }
      }}
      aria-label="Theme selector"
      classNames={{
        trigger: "h-8 min-h-unit-8 w-36",
        base: "w-36",
      }}
      renderValue={() => {
        const currentThemeOption = themeOptions.find((theme) => theme.key === currentTheme);
        return currentThemeOption ? (
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: themeColorMap[currentThemeOption.key][0],
              }}
            />
            <span className="text-sm font-medium">{currentThemeOption.label}</span>
          </div>
        ) : null;
      }}
    >
      {themeOptions.map((theme) => (
        <SelectItem
          key={theme.key}
          startContent={
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: themeColorMap[theme.key][0] }}
            />
          }
        >
          {theme.label}
        </SelectItem>
      ))}
    </Select>
  );
});

ThemeSelector.displayName = "ThemeSelector";

export { ThemeSelector };
