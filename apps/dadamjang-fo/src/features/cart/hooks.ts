import * as Crypto from "expo-crypto";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
  type MutateOptions,
} from "@tanstack/react-query";
import { getSessionGeneration } from "@dadamjang/graphql-client";

import { orderQueryKeys } from "@/features/order";

import {
  checkoutCart,
  getCart,
  getCheckoutAttempt,
  removeCartItem,
  upsertCartItem,
} from "./api";
import { cartQueryKeys } from "./query-keys";

import type {
  CheckoutAttempt,
  CheckoutAttemptResult,
  CheckoutAttemptSnapshotItem,
  CheckoutCartOptions,
  CheckoutCartResult,
  CheckoutExpectedCartItem,
} from "./types";

export const useCart = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: cartQueryKeys.detail(),
    queryFn: ({ signal }) => getCart(signal),
  });

const cartMutationKey = ["cart-action"];

const useCartMutation = <Input, Result, Request = Input>(
  mutationFn: (request: Request) => Promise<Result>,
  onSuccess: (result: Result, request: Request) => unknown,
  onError?: (error: Error, request: Request) => unknown,
  prepare?: (input: Input) => Request | null,
) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: cartMutationKey,
    retry: false,
    mutationFn: ({
      input,
      request,
      generation,
    }: {
      input: Input;
      request: Request;
      generation: number;
    }) => {
      if (getSessionGeneration() !== generation)
        throw new Error("Session changed");
      return mutationFn(request);
    },
    onSuccess: async (result, { request, generation }) => {
      if (getSessionGeneration() !== generation)
        throw new Error("Session changed");
      await onSuccess(result, request);
      if (getSessionGeneration() !== generation)
        throw new Error("Session changed");
    },
    onError: (error, { request, generation }) => {
      if (getSessionGeneration() === generation)
        return onError?.(error, request);
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
      if (!isBusy()) {
        const request = prepare
          ? prepare(input)
          : (input as unknown as Request);
        if (request === null) return;
        mutation.mutate(
          { input, request, generation: getSessionGeneration() },
          wrapOptions(options),
        );
      }
    },
    mutateAsync: async (input: Input, options?: Options) => {
      if (isBusy()) throw new Error("Cart update in progress");
      const generation = getSessionGeneration();
      const request = prepare ? prepare(input) : (input as unknown as Request);
      if (request === null) throw new Error("Cart action unavailable");
      const data = await mutation.mutateAsync(
        { input, request, generation },
        wrapOptions(options),
      );
      if (getSessionGeneration() !== generation)
        throw new Error("Session changed");
      return data;
    },
  };
};

const toCheckoutAttemptSnapshot = (
  items: CheckoutCartOptions["items"],
): CheckoutAttemptSnapshotItem[] =>
  items.map((item) => ({
    cartItemId: item.cartItemId,
    skuId: item.sku.skuId,
    quantity: item.quantity,
    unitPrice: item.sku.price,
    productId: item.product.productId,
    productTitle: item.product.title,
    optionName: item.sku.optionName,
  }));

const toCheckoutExpectedCart = (
  items: CheckoutAttemptSnapshotItem[],
): CheckoutExpectedCartItem[] =>
  items.map(({ cartItemId, quantity, skuId, unitPrice }) => ({
    cartItemId,
    skuId,
    quantity,
    unitPrice,
  }));

const submitCheckoutAttempt = (attempt: CheckoutAttempt) =>
  checkoutCart({
    idempotencyKey: attempt.idempotencyKey,
    expectedCart: attempt.expectedCart
      ? toCheckoutExpectedCart(attempt.expectedCart)
      : undefined,
  });

const isExplicitCheckoutRejection = (error: Error) => {
  const code = (error as Error & { code?: unknown }).code;
  return code === "BAD_USER_INPUT" || code === "CART_SNAPSHOT_CHANGED";
};

export const useCartActions = (userId?: string) => {
  const queryClient = useQueryClient();
  const generation = getSessionGeneration();
  const isPending = useIsMutating({ mutationKey: cartMutationKey }) > 0;
  const checkoutAttemptKey = cartQueryKeys.checkoutAttempt(userId, generation);
  const checkoutAttemptQuery = useQuery<CheckoutAttempt | null>({
    queryKey: checkoutAttemptKey,
    queryFn: async () => null,
    enabled: false,
    gcTime: Infinity,
    initialData: null,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
  const getCheckoutAttemptState = () =>
    queryClient.getQueryData<CheckoutAttempt | null>(checkoutAttemptKey) ??
    null;
  const setCheckoutAttemptState = (
    expected: CheckoutAttempt,
    update: (current: CheckoutAttempt) => CheckoutAttempt,
  ) => {
    if (
      getSessionGeneration() !== expected.generation ||
      userId !== expected.userId
    )
      return false;
    const current = getCheckoutAttemptState();
    if (
      !current ||
      current.userId !== expected.userId ||
      current.generation !== expected.generation ||
      current.idempotencyKey !== expected.idempotencyKey
    )
      return false;
    queryClient.setQueryData(checkoutAttemptKey, update(current));
    return true;
  };
  const createCheckoutAttempt = ({ items }: CheckoutCartOptions) => {
    if (!userId || getSessionGeneration() !== generation) return null;
    const current = getCheckoutAttemptState();
    if (
      current &&
      ["submitting", "uncertain", "checking", "retrying"].includes(
        current.phase,
      )
    )
      return null;
    const attempt: CheckoutAttempt = {
      userId,
      generation,
      idempotencyKey: Crypto.randomUUID(),
      expectedCart: toCheckoutAttemptSnapshot(items),
      phase: "submitting",
      startedAt: Date.now(),
    };
    queryClient.setQueryData(checkoutAttemptKey, attempt);
    return attempt;
  };
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: cartQueryKeys.detail() });
  const invalidateCheckout = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: cartQueryKeys.detail() }),
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.list() }),
    ]);
  const refetchCart = () =>
    queryClient.refetchQueries({ queryKey: cartQueryKeys.detail() });
  const confirmCheckoutAttempt = (
    result: CheckoutCartResult,
    attempt: CheckoutAttempt,
  ) => {
    if (
      !setCheckoutAttemptState(attempt, (current) => ({
        ...current,
        phase: "confirmed",
        orderId: result.orderId,
      }))
    )
      return;
    return invalidateCheckout();
  };
  const makeCheckoutAttemptUncertain = (attempt: CheckoutAttempt) =>
    setCheckoutAttemptState(attempt, (current) => ({
      ...current,
      phase: current.phase === "confirmed" ? "confirmed" : "uncertain",
    }));
  const checkout = useCartMutation<
    CheckoutCartOptions,
    CheckoutCartResult,
    CheckoutAttempt
  >(
    submitCheckoutAttempt,
    confirmCheckoutAttempt,
    (error, attempt) => {
      if (
        !setCheckoutAttemptState(attempt, (current) => ({
          ...current,
          phase:
            current.phase === "confirmed"
              ? "confirmed"
              : isExplicitCheckoutRejection(error)
                ? "rejected"
                : "uncertain",
        }))
      )
        return;
      return refetchCart();
    },
    createCheckoutAttempt,
  );
  const prepareRetry = () => {
    const attempt = getCheckoutAttemptState();
    if (!attempt || attempt.phase !== "uncertain" || !attempt.expectedCart)
      return null;
    if (
      !setCheckoutAttemptState(attempt, (current) => ({
        ...current,
        phase: "retrying",
      }))
    )
      return null;
    return attempt;
  };
  const retry = useCartMutation<void, CheckoutCartResult, CheckoutAttempt>(
    submitCheckoutAttempt,
    confirmCheckoutAttempt,
    (_error, attempt) => makeCheckoutAttemptUncertain(attempt),
    prepareRetry,
  );
  const check = useMutation({
    retry: false,
    mutationFn: async () => {
      const attempt = getCheckoutAttemptState();
      if (!attempt || attempt.phase !== "uncertain")
        throw new Error("Checkout check unavailable");
      if (
        !setCheckoutAttemptState(attempt, (current) => ({
          ...current,
          phase: "checking",
        }))
      )
        throw new Error("Checkout check unavailable");
      try {
        const lookup = await queryClient.fetchQuery<CheckoutAttemptResult>({
          queryKey: cartQueryKeys.checkoutAttemptResult(
            attempt.userId,
            attempt.generation,
            attempt.idempotencyKey,
          ),
          queryFn: ({ signal }) =>
            getCheckoutAttempt(attempt.idempotencyKey, signal),
          retry: false,
          staleTime: 0,
        });
        const lastCheckedAt = Date.now();
        let applied: boolean;
        if (lookup.status === "CONFIRMED") {
          applied = setCheckoutAttemptState(attempt, (current) => ({
            ...current,
            phase: "confirmed",
            orderId: lookup.orderId,
            lastCheckedAt,
          }));
          if (applied) await invalidateCheckout();
        } else {
          applied = setCheckoutAttemptState(attempt, (current) => ({
            ...current,
            phase: current.phase === "confirmed" ? "confirmed" : "uncertain",
            lastCheckedAt,
          }));
        }
        if (
          !applied ||
          getSessionGeneration() !== attempt.generation ||
          userId !== attempt.userId
        )
          throw new Error("Session changed");
        return lookup;
      } catch (error) {
        setCheckoutAttemptState(attempt, (current) => ({
          ...current,
          phase: current.phase === "confirmed" ? "confirmed" : "uncertain",
          lastCheckedAt: Date.now(),
        }));
        throw error;
      }
    },
  });

  return {
    isPending,
    upsert: useCartMutation(
      ({ skuId, quantity }: { skuId: string; quantity: number }) =>
        upsertCartItem(skuId, quantity),
      invalidate,
    ),
    remove: useCartMutation(removeCartItem, invalidate),
    checkout,
    checkoutAttempt: checkoutAttemptQuery.data,
    canRetry:
      checkoutAttemptQuery.data?.phase === "uncertain" &&
      Boolean(checkoutAttemptQuery.data.expectedCart),
    check,
    retry,
  };
};
