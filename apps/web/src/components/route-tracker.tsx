"use client";

import { usePreviousRoute } from "@/hooks/use-previous-route";

export function RouteTracker() {
  // This component just needs to exist to initialize the route tracking
  usePreviousRoute();
  return null;
}
