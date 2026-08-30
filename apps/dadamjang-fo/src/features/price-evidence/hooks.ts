import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getComparisonPriceSummaries,
  getProductPriceEvidence,
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

export const useProductPriceEvidence = (
  productId: string,
  priceRevision: string,
  enabled: boolean,
) =>
  useQuery({
    queryKey: priceEvidenceQueryKeys.productPriceEvidence(
      productId,
      priceRevision,
    ),
    queryFn: ({ signal }) =>
      getProductPriceEvidence(productId, priceRevision, signal),
    enabled,
    staleTime: 60_000,
  });

export const useComparisonPriceSummaries = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: priceEvidenceQueryKeys.productPriceSummary({
      query: "comparison",
    }),
    queryFn: ({ signal }) => getComparisonPriceSummaries(signal),
  });

export const usePriceEvidenceInvalidation = () => {
  const queryClient = useQueryClient();

  return {
    invalidateProductPriceEvidence: (
      productId: string,
      priceRevision: string,
    ) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: priceEvidenceQueryKeys.productPriceEvidence(
            productId,
            priceRevision,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: priceEvidenceQueryKeys.offers(productId),
        }),
      ]),
  };
};
