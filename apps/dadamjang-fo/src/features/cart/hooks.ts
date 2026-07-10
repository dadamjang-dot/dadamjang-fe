import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { checkoutCart, getCart, removeCartItem, upsertCartItem } from './api';

export const useCart = () => useQuery({ queryKey: ['cart'], queryFn: getCart });

export const useCartActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cart'] });

  return {
    upsert: useMutation({
      mutationFn: ({ skuId, quantity }: { skuId: string; quantity: number }) =>
        upsertCartItem(skuId, quantity),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: removeCartItem, onSuccess: invalidate }),
    checkout: useMutation({ mutationFn: checkoutCart, onSuccess: invalidate }),
  };
};
