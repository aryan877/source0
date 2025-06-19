"use client";

import { QueryProvider } from "@/providers/query-provider";
import { themeOptions } from "@/stores/user-preferences-store";
import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <HeroUIProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="lavender"
        themes={themeOptions.map((t) => t.key)}
      >
        <QueryProvider>
          {children}
          <ToastProvider />
        </QueryProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
