import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { getComparisonPriceSummaries, getProductPriceEvidence, getProductPriceSummaries } from './api';
import { priceEvidenceQueryKeys } from './query-keys';

import type { ProductPriceSummaryFilter } from './types';

export const useProductPriceSummaries = (filter: ProductPriceSummaryFilter) =>
  useInfiniteQuery({
    queryKey: priceEvidenceQueryKeys.productPriceSummary(filter),
    queryFn: ({ pageParam }) => getProductPriceSummaries({ ...filter, after: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
  });

export const useProductPriceEvidence = (productId: string, priceRevision: string, enabled: boolean) =>
  useQuery({
    queryKey: priceEvidenceQueryKeys.productPriceEvidence(productId, priceRevision),
    queryFn: () => getProductPriceEvidence(productId, priceRevision),
    enabled,
    staleTime: 60_000,
  });

export const useComparisonPriceSummaries = () =>
  useQuery({
    queryKey: priceEvidenceQueryKeys.productPriceSummary({ query: 'comparison' }),
    queryFn: getComparisonPriceSummaries,
  });

export const usePriceEvidenceInvalidation = () => {
  const queryClient = useQueryClient();

  return {
    invalidateProductPriceEvidence: (productId: string, priceRevision: string) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: priceEvidenceQueryKeys.productPriceEvidence(productId, priceRevision),
        }),
        queryClient.invalidateQueries({ queryKey: priceEvidenceQueryKeys.offers(productId) }),
      ]),
  };
};
