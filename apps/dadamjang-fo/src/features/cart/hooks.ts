import * as Crypto from "expo-crypto";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
  type MutateOptions,
} from "@tanstack/react-query";
import { useRef } from "react";
import { getSessionGeneration } from "@dadamjang/graphql-client";

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

const cartMutationKey = ["cart-action"];

const useCartMutation = <Input, Result>(
  mutationFn: (input: Input) => Promise<Result>,
  onSuccess: () => unknown,
  onError?: () => unknown,
) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: cartMutationKey,
    mutationFn: ({
      input,
      generation,
    }: {
      input: Input;
      generation: number;
    }) => {
      if (getSessionGeneration() !== generation)
        throw new Error("Session changed");
      return mutationFn(input);
    },
    onSuccess: async (_result, { generation }) => {
      if (getSessionGeneration() !== generation)
        throw new Error("Session changed");
      await onSuccess();
      if (getSessionGeneration() !== generation)
        throw new Error("Session changed");
    },
    onError: (_error, { generation }) => {
      if (getSessionGeneration() === generation) return onError?.();
    },
  });
  const isBusy = () =>
    queryClient.isMutating({ mutationKey: cartMutationKey }) > 0;
  type Options = MutateOptions<Result, Error, Input, typeof mutation.context>;
  const wrapOptions = (
    options?: Options,
  ): Parameters<typeof mutation.mutate>[1] => ({
    onSuccess: (data, { input, generation }, result, context) => {
      if (getSessionGeneration() === generation)
        options?.onSuccess?.(data, input, result, context);
    },
    onError: (error, { input, generation }, result, context) => {
      if (getSessionGeneration() === generation)
        options?.onError?.(error, input, result, context);
    },
    onSettled: (data, error, { input, generation }, result, context) => {
      if (getSessionGeneration() === generation)
        options?.onSettled?.(data, error, input, result, context);
    },
  });
  return {
    ...mutation,
    variables: mutation.variables?.input,
    mutate: (input: Input, options?: Options) => {
      if (!isBusy())
        mutation.mutate(
          { input, generation: getSessionGeneration() },
          wrapOptions(options),
        );
    },
    mutateAsync: async (input: Input, options?: Options) => {
      if (isBusy()) throw new Error("Cart update in progress");
      const generation = getSessionGeneration();
      const data = await mutation.mutateAsync(
        { input, generation },
        wrapOptions(options),
      );
      if (getSessionGeneration() !== generation)
        throw new Error("Session changed");
      return data;
    },
  };
};

export const useCartActions = () => {
  const queryClient = useQueryClient();
  const isPending = useIsMutating({ mutationKey: cartMutationKey }) > 0;
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
    isPending,
    upsert: useCartMutation(
      ({ skuId, quantity }: { skuId: string; quantity: number }) =>
        upsertCartItem(skuId, quantity),
      invalidateAfterCartChange,
    ),
    remove: useCartMutation(removeCartItem, invalidateAfterCartChange),
    checkout: useCartMutation(
      (input?: CheckoutCartOptions) => {
        const idempotencyKey =
          input?.idempotencyKey ??
          (checkoutAttemptKey.current ??= Crypto.randomUUID());
        return checkoutCart({ idempotencyKey });
      },
      invalidateCheckout,
      refetchCart,
    ),
  };
};
