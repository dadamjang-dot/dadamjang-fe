import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { trackCommerceEvent } from '@/features/analytics';
import { priceEvidenceQueryKeys } from '@/features/price-evidence';

import { addComparisonItem, getComparison, removeComparisonItem } from './api';
import { comparisonQueryKeys } from './query-keys';

export const useComparison = () => useQuery({ queryKey: comparisonQueryKeys.list(), queryFn: getComparison });

export const useComparisonActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: comparisonQueryKeys.list() }),
      queryClient.invalidateQueries({ queryKey: priceEvidenceQueryKeys.productPriceSummary({ query: 'comparison' }) }),
    ]);

  return {
    add: useMutation({ mutationFn: addComparisonItem, onSuccess: invalidate }),
    remove: useMutation({
      mutationFn: removeComparisonItem,
      onSuccess: (_data, productId) => {
        trackCommerceEvent({ eventType: 'COMPARISON_REMOVED', subjectType: 'PRODUCT', subjectId: productId });
        return invalidate();
      },
    }),
  };
};
