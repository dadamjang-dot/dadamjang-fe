import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { orderQueryKeys } from '@/features/order';

import { checkoutCart, getCart, removeCartItem, upsertCartItem } from './api';
import { cartQueryKeys } from './query-keys';

export const useCart = () => useQuery({ queryKey: cartQueryKeys.detail(), queryFn: getCart });

export const useCartActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: cartQueryKeys.detail() });
  const invalidateCheckout = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: cartQueryKeys.detail() }),
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.list() }),
    ]);

  return {
    upsert: useMutation({
      mutationFn: ({ skuId, quantity }: { skuId: string; quantity: number }) =>
        upsertCartItem(skuId, quantity),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: removeCartItem, onSuccess: invalidate }),
    checkout: useMutation({ mutationFn: checkoutCart, onSuccess: invalidateCheckout }),
  };
};
