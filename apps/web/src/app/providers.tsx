"use client";

import { QueryProvider } from "@/providers/query-provider";
import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <HeroUIProvider>
      <NextThemesProvider attribute="class" defaultTheme="light" themes={["light", "dark"]}>
        <QueryProvider>{children}</QueryProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
