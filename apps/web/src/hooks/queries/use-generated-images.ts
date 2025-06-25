"use client";

import { getGeneratedImages } from "@/services/generated-images";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export interface GeneratedImagesFilters {
  pageSize?: number;
}

export function useGeneratedImages(filters: GeneratedImagesFilters) {
  const {
    data,
    error,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["generated-images", filters],
    queryFn: ({ pageParam: cursor }) => getGeneratedImages({ ...filters, cursor }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    gcTime: 0,
    staleTime: 0,
  });

  const images = useMemo(() => data?.pages.flatMap((page) => page.data) || [], [data]);

  return {
    images,
    error,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
    refetch,
  };
}
