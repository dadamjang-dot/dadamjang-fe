import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { priceEvidenceQueryKeys } from "@/features/price-evidence";

import { addComparisonItem, getComparison, removeComparisonItem } from "./api";
import { comparisonQueryKeys } from "./query-keys";

export const useComparison = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: comparisonQueryKeys.list(),
    queryFn: ({ signal }) => getComparison(signal),
  });

export const useComparisonActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: comparisonQueryKeys.list() }),
      queryClient.invalidateQueries({
        queryKey: priceEvidenceQueryKeys.productPriceSummary({
          query: "comparison",
        }),
      }),
    ]);

  return {
    add: useMutation({ mutationFn: addComparisonItem, onSuccess: invalidate }),
    remove: useMutation({
      mutationFn: removeComparisonItem,
      onSuccess: invalidate,
    }),
  };
};
