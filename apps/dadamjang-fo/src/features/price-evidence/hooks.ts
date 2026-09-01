import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  getProductPriceSummary,
  getProductPriceSummaries,
} from "./api";
import { priceEvidenceQueryKeys } from "./query-keys";

import type {
  ProductPriceSummaryConnection,
  ProductPriceSummaryFilter,
} from "./types";

const getNextProductPriceSummaryCursor = (
  lastPage: ProductPriceSummaryConnection,
  allPages: ProductPriceSummaryConnection[],
) => {
  if (!lastPage.hasNextPage || lastPage.nextCursor === null) return undefined;
  const { nextCursor } = lastPage;
  if (
    allPages.some(
      (page, index) =>
        index < allPages.length - 1 && page.nextCursor === nextCursor,
    )
  )
    return undefined;
  return nextCursor;
};

export const useProductPriceSummaries = (filter: ProductPriceSummaryFilter) =>
  useInfiniteQuery({
    queryKey: priceEvidenceQueryKeys.productPriceSummary(filter),
    queryFn: ({ pageParam, signal }) =>
      getProductPriceSummaries({ ...filter, after: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextProductPriceSummaryCursor,
  });

export const useProductPriceSummary = (productId: string) =>
  useQuery({
    queryKey: priceEvidenceQueryKeys.productPriceSummaryById(productId),
    queryFn: ({ signal }) => getProductPriceSummary(productId, signal),
    enabled: Boolean(productId),
    staleTime: 60_000,
  });
