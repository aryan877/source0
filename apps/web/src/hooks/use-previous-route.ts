"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function usePreviousRoute() {
  const pathname = usePathname();

  useEffect(() => {
    // Store the current path as previous when pathname changes
    const storage = globalThis?.sessionStorage;
    if (!storage) return;

    // Get the current stored path to use as previous
    const currentPath = storage.getItem("currentPath");

    // Only update if the pathname is different from stored current path
    if (currentPath !== pathname) {
      // Set the previous path as the current stored path
      storage.setItem("prevPath", currentPath ?? "/");
      // Set the new current path
      storage.setItem("currentPath", pathname);
    }
  }, [pathname]);

  const getPreviousPath = () => {
    if (typeof window === "undefined") return "/";
    return sessionStorage.getItem("prevPath") || "/";
  };

  const isChatRoute = (path: string) => {
    return /^\/chat\/[^/]+$/.test(path);
  };

  const getBackPath = () => {
    const prevPath = getPreviousPath();
    // If previous path was a chat route, return to it
    if (isChatRoute(prevPath)) {
      return prevPath;
    }
    // Otherwise, return to home
    return "/";
  };

  return {
    getPreviousPath,
    getBackPath,
    isChatRoute,
  };
}
