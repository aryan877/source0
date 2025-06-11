"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./app-shell";

interface ConditionalAppShellProps {
  children: React.ReactNode;
}

export function ConditionalAppShell({ children }: ConditionalAppShellProps) {
  const pathname = usePathname();

  // Routes that should NOT have the AppShell
  const excludedRoutes = ["/auth"];

  // Check if current path should be excluded
  const shouldExcludeAppShell = excludedRoutes.some((route) => pathname.startsWith(route));

  if (shouldExcludeAppShell) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
