import * as Crypto from "expo-crypto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { orderQueryKeys } from "@/features/order";

import { checkoutCart, getCart, removeCartItem, upsertCartItem } from "./api";
import { cartQueryKeys } from "./query-keys";

import type { CheckoutCartOptions } from "./types";

export const useCart = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: cartQueryKeys.detail(),
    queryFn: ({ signal }) => getCart(signal),
  });

export const useCartActions = () => {
  const queryClient = useQueryClient();
  const checkoutAttemptKey = useRef<string | undefined>(undefined);
  const resetCheckoutAttempt = () => {
    checkoutAttemptKey.current = undefined;
  };
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: cartQueryKeys.detail() });
  const invalidateAfterCartChange = () => {
    resetCheckoutAttempt();
    return invalidate();
  };
  const invalidateCheckout = () => {
    resetCheckoutAttempt();
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: cartQueryKeys.detail() }),
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.list() }),
    ]);
  };
  const refetchCart = () =>
    queryClient.refetchQueries({ queryKey: cartQueryKeys.detail() });

  return {
    upsert: useMutation({
      mutationFn: ({ skuId, quantity }: { skuId: string; quantity: number }) =>
        upsertCartItem(skuId, quantity),
      onSuccess: invalidateAfterCartChange,
    }),
    remove: useMutation({
      mutationFn: removeCartItem,
      onSuccess: invalidateAfterCartChange,
    }),
    checkout: useMutation({
      mutationFn: (input?: CheckoutCartOptions) => {
        const idempotencyKey =
          input?.idempotencyKey ??
          (checkoutAttemptKey.current ??= Crypto.randomUUID());
        return checkoutCart({ idempotencyKey });
      },
      onSuccess: invalidateCheckout,
      onError: refetchCart,
    }),
  };
};
