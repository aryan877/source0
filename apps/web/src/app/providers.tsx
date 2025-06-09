"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <HeroUIProvider>
      <NextThemesProvider attribute="class" defaultTheme="light" themes={["light", "dark"]}>
        {children}
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
