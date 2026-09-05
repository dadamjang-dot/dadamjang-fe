import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Crypto from "expo-crypto";
import type { ReactNode } from "react";

import { getSessionGeneration } from "@dadamjang/graphql-client";

import { checkoutCart, getCart, getCheckoutAttempt } from "@/features/cart/api";
import { useCart, useCartActions } from "@/features/cart/hooks";
import { cartQueryKeys } from "@/features/cart/query-keys";

import type {
  Cart,
  CheckoutAttempt,
  CheckoutCartResult,
} from "@/features/cart/types";

jest.mock("@dadamjang/graphql-client", () => ({
  getSessionGeneration: jest.fn(() => 0),
}));

jest.mock("@/features/cart/api", () => ({
  checkoutCart: jest.fn(),
  getCart: jest.fn(),
  getCheckoutAttempt: jest.fn(),
  removeCartItem: jest.fn(),
  upsertCartItem: jest.fn(),
}));

const cartItems: Cart["items"] = [
  {
    cartItemId: "cart-item-1",
    quantity: 2,
    sku: { skuId: "sku-1", optionName: "검정 / M", price: 4_000 },
    product: {
      productId: "product-1",
      title: "테스트 상품",
      imageUrls: ["https://example.com/product.png"],
    },
  },
];

const order: CheckoutCartResult = {
  orderId: "order-1",
  orderNumber: "DJ-1",
  status: "PAYMENT_PENDING",
  paymentStatus: "PENDING",
  totalAmount: 8_000,
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
};

const createSetup = (
  queryGcTime = Infinity,
  mutationRetry: boolean | number = false,
  queryRetry: boolean | number = false,
) => {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: mutationRetry, retryDelay: 0 },
      queries: {
        gcTime: queryGcTime,
        retry: queryRetry,
        retryDelay: 0,
      },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "CheckoutAttemptWrapper";
  return { client, wrapper: Wrapper };
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getSessionGeneration).mockReturnValue(0);
  jest
    .mocked(Crypto.randomUUID)
    .mockReturnValue("00000000-0000-4000-8000-000000000001");
});

it("fixes one key and original snapshot across five rapid submits", async () => {
  const { client, wrapper } = createSetup();
  const request = deferred<CheckoutCartResult>();
  jest.mocked(checkoutCart).mockReturnValue(request.promise);
  const { result, unmount } = renderHook(() => useCartActions("user-1"), {
    wrapper,
  });

  act(() => {
    for (let press = 0; press < 5; press += 1)
      result.current.checkout.mutate({ items: cartItems });
  });

  await waitFor(() => expect(checkoutCart).toHaveBeenCalledTimes(1));
  expect(checkoutCart).toHaveBeenCalledWith({
    idempotencyKey: "00000000-0000-4000-8000-000000000001",
    expectedCart: [
      {
        cartItemId: "cart-item-1",
        skuId: "sku-1",
        quantity: 2,
        unitPrice: 4_000,
      },
    ],
  });
  expect(result.current.checkoutAttempt).toMatchObject({
    userId: "user-1",
    generation: 0,
    idempotencyKey: "00000000-0000-4000-8000-000000000001",
    phase: "submitting",
    expectedCart: [
      {
        cartItemId: "cart-item-1",
        skuId: "sku-1",
        quantity: 2,
        unitPrice: 4_000,
        productId: "product-1",
        productTitle: "테스트 상품",
        optionName: "검정 / M",
      },
    ],
  });

  await act(async () => {
    request.resolve(order);
    await request.promise;
  });
  await waitFor(() =>
    expect(result.current.checkoutAttempt).toMatchObject({
      phase: "confirmed",
      orderId: "order-1",
    }),
  );
  act(() => {
    unmount();
    client.clear();
  });
});

it("keeps a lost request uncertain after one read-only not-observed check", async () => {
  const { client, wrapper } = createSetup();
  jest.mocked(checkoutCart).mockRejectedValueOnce(new Error("response lost"));
  const lookup = deferred<{
    status: "NOT_OBSERVED";
    orderId: null;
  }>();
  jest.mocked(getCheckoutAttempt).mockReturnValue(lookup.promise);
  const { result, unmount } = renderHook(() => useCartActions("user-1"), {
    wrapper,
  });

  await act(async () => {
    await expect(
      result.current.checkout.mutateAsync({ items: cartItems }),
    ).rejects.toThrow("response lost");
  });
  expect(result.current.checkoutAttempt?.phase).toBe("uncertain");

  let check!: Promise<unknown>;
  act(() => {
    check = result.current.check.mutateAsync();
  });
  await waitFor(() =>
    expect(result.current.checkoutAttempt?.phase).toBe("checking"),
  );
  await act(async () => {
    lookup.resolve({ status: "NOT_OBSERVED", orderId: null });
    await check;
  });

  expect(getCheckoutAttempt).toHaveBeenCalledTimes(1);
  expect(getCheckoutAttempt).toHaveBeenCalledWith(
    "00000000-0000-4000-8000-000000000001",
    expect.anything(),
  );
  expect(checkoutCart).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(result.current.checkoutAttempt).toMatchObject({
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
      phase: "uncertain",
      lastCheckedAt: expect.any(Number),
    }),
  );
  act(() => {
    unmount();
    client.clear();
  });
});

it("confirms the original order from a later check and invalidates caches", async () => {
  const { client, wrapper } = createSetup();
  client.setQueryData(["cart"], { cartId: "cart-1", items: cartItems });
  client.setQueryData(["orders"], []);
  jest.mocked(checkoutCart).mockRejectedValueOnce(new Error("response lost"));
  jest.mocked(getCheckoutAttempt).mockResolvedValueOnce({
    status: "CONFIRMED",
    orderId: "order-1",
  });
  const { result, unmount } = renderHook(() => useCartActions("user-1"), {
    wrapper,
  });

  await act(async () => {
    await result.current.checkout
      .mutateAsync({ items: cartItems })
      .catch(() => undefined);
    await result.current.check.mutateAsync();
  });

  await waitFor(() =>
    expect(result.current.checkoutAttempt).toMatchObject({
      phase: "confirmed",
      orderId: "order-1",
    }),
  );
  expect(client.getQueryState(["cart"])?.isInvalidated).toBe(true);
  expect(client.getQueryState(["orders"])?.isInvalidated).toBe(true);
  act(() => {
    unmount();
    client.clear();
  });
});

it("retries explicitly with the same key and original snapshot", async () => {
  const { client, wrapper } = createSetup();
  const retryRequest = deferred<CheckoutCartResult>();
  jest
    .mocked(checkoutCart)
    .mockRejectedValueOnce(new Error("response lost"))
    .mockReturnValueOnce(retryRequest.promise);
  const { result, unmount } = renderHook(() => useCartActions("user-1"), {
    wrapper,
  });

  await act(async () => {
    await result.current.checkout
      .mutateAsync({ items: cartItems })
      .catch(() => undefined);
  });
  let retry!: Promise<unknown>;
  act(() => {
    retry = result.current.retry.mutateAsync();
  });

  await waitFor(() =>
    expect(result.current.checkoutAttempt?.phase).toBe("retrying"),
  );
  expect(checkoutCart).toHaveBeenCalledTimes(2);
  expect(jest.mocked(checkoutCart).mock.calls[1]?.[0]).toEqual(
    jest.mocked(checkoutCart).mock.calls[0]?.[0],
  );

  await act(async () => {
    retryRequest.resolve(order);
    await retry;
  });
  await waitFor(() =>
    expect(result.current.checkoutAttempt).toMatchObject({
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
      phase: "confirmed",
      orderId: "order-1",
    }),
  );
  act(() => {
    unmount();
    client.clear();
  });
});

it.each(["BAD_USER_INPUT", "CART_SNAPSHOT_CHANGED"])(
  "marks an explicit first-request %s rejection as rejected",
  async (code) => {
    const { client, wrapper } = createSetup();
    jest
      .mocked(checkoutCart)
      .mockRejectedValueOnce(
        Object.assign(new Error("checkout rejected"), { code }),
      );
    const { result, unmount } = renderHook(() => useCartActions("user-1"), {
      wrapper,
    });

    await act(async () => {
      await result.current.checkout
        .mutateAsync({ items: cartItems })
        .catch(() => undefined);
    });

    await waitFor(() =>
      expect(result.current.checkoutAttempt?.phase).toBe("rejected"),
    );
    act(() => {
      unmount();
      client.clear();
    });
  },
);

it("keeps an uncertain attempt uncertain when its explicit retry fails", async () => {
  const { client, wrapper } = createSetup();
  jest
    .mocked(checkoutCart)
    .mockRejectedValueOnce(new Error("response lost"))
    .mockRejectedValueOnce(
      Object.assign(new Error("snapshot rejected"), {
        code: "CART_SNAPSHOT_CHANGED",
      }),
    );
  const { result, unmount } = renderHook(() => useCartActions("user-1"), {
    wrapper,
  });

  await act(async () => {
    await result.current.checkout
      .mutateAsync({ items: cartItems })
      .catch(() => undefined);
    await result.current.retry.mutateAsync().catch(() => undefined);
  });

  await waitFor(() =>
    expect(result.current.checkoutAttempt?.phase).toBe("uncertain"),
  );
  act(() => {
    unmount();
    client.clear();
  });
});

it("preserves an uncertain attempt across cart refetch failure and remount", async () => {
  const { client, wrapper } = createSetup(5);
  jest
    .mocked(getCart)
    .mockResolvedValueOnce({
      cartId: "cart-1",
      items: cartItems,
      totalAmount: 8_000,
    })
    .mockRejectedValueOnce(new Error("cart unavailable"));
  jest.mocked(checkoutCart).mockRejectedValueOnce(new Error("response lost"));
  const first = renderHook(
    () => ({ cart: useCart(), actions: useCartActions("user-1") }),
    { wrapper },
  );
  await waitFor(() => expect(first.result.current.cart.isSuccess).toBe(true));

  await act(async () => {
    await first.result.current.actions.checkout
      .mutateAsync({ items: cartItems })
      .catch(() => undefined);
  });
  await waitFor(() => {
    expect(first.result.current.cart.isError).toBe(true);
    expect(first.result.current.actions.checkoutAttempt?.phase).toBe(
      "uncertain",
    );
  });
  act(() => first.unmount());
  await new Promise((resolve) => setTimeout(resolve, 20));

  const second = renderHook(() => useCartActions("user-1"), { wrapper });
  expect(second.result.current.checkoutAttempt).toMatchObject({
    idempotencyKey: "00000000-0000-4000-8000-000000000001",
    phase: "uncertain",
  });
  act(() => {
    second.unmount();
    client.clear();
  });
});

it("rejects a late mutation result after the stored attempt key changes", async () => {
  const { client, wrapper } = createSetup();
  const request = deferred<CheckoutCartResult>();
  jest.mocked(checkoutCart).mockReturnValueOnce(request.promise);
  const { result, unmount } = renderHook(() => useCartActions("user-1"), {
    wrapper,
  });
  let checkout!: Promise<CheckoutCartResult>;
  act(() => {
    checkout = result.current.checkout.mutateAsync({ items: cartItems });
  });
  await waitFor(() => expect(checkoutCart).toHaveBeenCalledTimes(1));
  const replacement: CheckoutAttempt = {
    userId: "user-1",
    generation: 0,
    idempotencyKey: "00000000-0000-4000-8000-000000000002",
    phase: "uncertain",
    startedAt: 2,
  };
  act(() => {
    client.setQueryData(
      cartQueryKeys.checkoutAttempt("user-1", 0),
      replacement,
    );
  });

  await act(async () => {
    request.resolve(order);
    await checkout;
  });

  expect(
    client.getQueryData<CheckoutAttempt>(
      cartQueryKeys.checkoutAttempt("user-1", 0),
    ),
  ).toEqual(replacement);
  act(() => {
    unmount();
    client.clear();
  });
});

it.each([
  ["user", { userId: "user-2" }],
  ["session generation", { generation: 1 }],
] as const)(
  "rejects a late mutation result after the stored %s changes",
  async (_label, changedIdentity) => {
    const { client, wrapper } = createSetup();
    const request = deferred<CheckoutCartResult>();
    jest.mocked(checkoutCart).mockReturnValueOnce(request.promise);
    const { result, unmount } = renderHook(() => useCartActions("user-1"), {
      wrapper,
    });
    let checkout!: Promise<CheckoutCartResult>;
    act(() => {
      checkout = result.current.checkout.mutateAsync({ items: cartItems });
    });
    await waitFor(() => expect(checkoutCart).toHaveBeenCalledTimes(1));
    const replacement: CheckoutAttempt = {
      userId: "user-1",
      generation: 0,
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
      phase: "uncertain",
      startedAt: 2,
      ...changedIdentity,
    };
    act(() => {
      client.setQueryData(
        cartQueryKeys.checkoutAttempt("user-1", 0),
        replacement,
      );
    });

    await act(async () => {
      request.resolve(order);
      await checkout;
    });

    expect(
      client.getQueryData<CheckoutAttempt>(
        cartQueryKeys.checkoutAttempt("user-1", 0),
      ),
    ).toEqual(replacement);
    act(() => {
      unmount();
      client.clear();
    });
  },
);

it("does not regress a confirmed attempt when an older lookup fails", async () => {
  const { client, wrapper } = createSetup();
  jest.mocked(checkoutCart).mockRejectedValueOnce(new Error("response lost"));
  const lookup = deferred<{ status: "CONFIRMED"; orderId: string }>();
  jest.mocked(getCheckoutAttempt).mockReturnValueOnce(lookup.promise);
  const { result, unmount } = renderHook(() => useCartActions("user-1"), {
    wrapper,
  });
  await act(async () => {
    await result.current.checkout
      .mutateAsync({ items: cartItems })
      .catch(() => undefined);
  });
  let check!: Promise<unknown>;
  act(() => {
    check = result.current.check.mutateAsync();
  });
  await waitFor(() =>
    expect(result.current.checkoutAttempt?.phase).toBe("checking"),
  );
  act(() => {
    const current = client.getQueryData<CheckoutAttempt>(
      cartQueryKeys.checkoutAttempt("user-1", 0),
    );
    client.setQueryData(cartQueryKeys.checkoutAttempt("user-1", 0), {
      ...current,
      phase: "confirmed",
      orderId: "order-1",
    });
  });

  await act(async () => {
    lookup.reject(new Error("late lookup failure"));
    await check.catch(() => undefined);
  });

  await waitFor(() =>
    expect(result.current.checkoutAttempt).toMatchObject({
      phase: "confirmed",
      orderId: "order-1",
    }),
  );
  act(() => {
    unmount();
    client.clear();
  });
});

it("allows checking but not retrying a snapshotless attempt", async () => {
  const { client, wrapper } = createSetup();
  client.setQueryData<CheckoutAttempt>(
    cartQueryKeys.checkoutAttempt("user-1", 0),
    {
      userId: "user-1",
      generation: 0,
      idempotencyKey: "legacy-checkout",
      phase: "uncertain",
      startedAt: 1,
    },
  );
  jest.mocked(getCheckoutAttempt).mockResolvedValueOnce({
    status: "NOT_OBSERVED",
    orderId: null,
  });
  const { result, unmount } = renderHook(() => useCartActions("user-1"), {
    wrapper,
  });

  expect(result.current.canRetry).toBe(false);
  await act(async () => {
    await result.current.check.mutateAsync();
    await expect(result.current.retry.mutateAsync()).rejects.toThrow();
  });

  expect(getCheckoutAttempt).toHaveBeenCalledTimes(1);
  expect(checkoutCart).not.toHaveBeenCalled();
  expect(result.current.checkoutAttempt?.phase).toBe("uncertain");
  act(() => {
    unmount();
    client.clear();
  });
});

it("does not automatically retry a failed checkout mutation", async () => {
  const { client, wrapper } = createSetup(Infinity, 3);
  jest.mocked(checkoutCart).mockRejectedValue(new Error("response lost"));
  const { result, unmount } = renderHook(() => useCartActions("user-1"), {
    wrapper,
  });

  await act(async () => {
    await result.current.checkout
      .mutateAsync({ items: cartItems })
      .catch(() => undefined);
  });

  expect(checkoutCart).toHaveBeenCalledTimes(1);
  act(() => {
    unmount();
    client.clear();
  });
});

it("does not retry a failed manual lookup", async () => {
  const { client, wrapper } = createSetup(Infinity, false, 3);
  jest.mocked(checkoutCart).mockRejectedValueOnce(new Error("response lost"));
  jest.mocked(getCheckoutAttempt).mockRejectedValue(new Error("lookup failed"));
  const { result, unmount } = renderHook(() => useCartActions("user-1"), {
    wrapper,
  });
  await act(async () => {
    await result.current.checkout
      .mutateAsync({ items: cartItems })
      .catch(() => undefined);
    await result.current.check.mutateAsync().catch(() => undefined);
  });

  expect(getCheckoutAttempt).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(result.current.checkoutAttempt?.phase).toBe("uncertain"),
  );
  act(() => {
    unmount();
    client.clear();
  });
});

it("does not check automatically on focus reconnect or remount", async () => {
  const { client, wrapper } = createSetup();
  jest.mocked(checkoutCart).mockRejectedValueOnce(new Error("response lost"));
  jest.mocked(getCheckoutAttempt).mockResolvedValue({
    status: "NOT_OBSERVED",
    orderId: null,
  });
  const first = renderHook(() => useCartActions("user-1"), { wrapper });
  await act(async () => {
    await first.result.current.checkout
      .mutateAsync({ items: cartItems })
      .catch(() => undefined);
    await first.result.current.check.mutateAsync();
  });

  act(() => {
    focusManager.setFocused(false);
    onlineManager.setOnline(false);
    focusManager.setFocused(true);
    onlineManager.setOnline(true);
    first.unmount();
  });
  const second = renderHook(() => useCartActions("user-1"), { wrapper });
  await act(async () => Promise.resolve());

  expect(getCheckoutAttempt).toHaveBeenCalledTimes(1);
  expect(
    client.getQueryData(
      cartQueryKeys.checkoutAttemptResult(
        "user-1",
        0,
        "00000000-0000-4000-8000-000000000001",
      ),
    ),
  ).toEqual({ status: "NOT_OBSERVED", orderId: null });
  expect(
    client.getQueryData<CheckoutAttempt>(
      cartQueryKeys.checkoutAttempt("user-1", 0),
    )?.phase,
  ).toBe("uncertain");
  act(() => {
    second.unmount();
    client.clear();
  });
});

it("does not restore an old attempt after the session cache is cleared", async () => {
  const { client, wrapper } = createSetup();
  const request = deferred<CheckoutCartResult>();
  jest.mocked(checkoutCart).mockReturnValueOnce(request.promise);
  const { result, unmount } = renderHook(() => useCartActions("user-1"), {
    wrapper,
  });
  let checkout!: Promise<CheckoutCartResult>;
  act(() => {
    checkout = result.current.checkout.mutateAsync({ items: cartItems });
  });
  await waitFor(() => expect(checkoutCart).toHaveBeenCalledTimes(1));

  await act(async () => {
    client.clear();
    jest.mocked(getSessionGeneration).mockReturnValue(1);
    request.resolve(order);
    await checkout.catch(() => undefined);
  });

  expect(
    client.getQueryCache().findAll({ queryKey: ["checkout-attempt"] }),
  ).toHaveLength(0);
  act(() => unmount());
});

it("rejects a lookup result that returns after the session changes", async () => {
  const { client, wrapper } = createSetup();
  client.setQueryData<CheckoutAttempt>(
    cartQueryKeys.checkoutAttempt("user-1", 0),
    {
      userId: "user-1",
      generation: 0,
      idempotencyKey: "checkout-1",
      expectedCart: [],
      phase: "uncertain",
      startedAt: 1,
    },
  );
  const lookup = deferred<{ status: "CONFIRMED"; orderId: string }>();
  jest.mocked(getCheckoutAttempt).mockReturnValueOnce(lookup.promise);
  const { result, unmount } = renderHook(() => useCartActions("user-1"), {
    wrapper,
  });
  let outcome!: Promise<string>;
  act(() => {
    outcome = result.current.check.mutateAsync().then(
      () => "resolved",
      () => "rejected",
    );
  });
  await waitFor(() =>
    expect(result.current.checkoutAttempt?.phase).toBe("checking"),
  );

  await act(async () => {
    jest.mocked(getSessionGeneration).mockReturnValue(1);
    lookup.resolve({ status: "CONFIRMED", orderId: "old-order" });
    await outcome;
  });

  expect(await outcome).toBe("rejected");
  const storedAttempt = client.getQueryData<CheckoutAttempt>(
    cartQueryKeys.checkoutAttempt("user-1", 0),
  );
  expect(storedAttempt?.phase).toBe("checking");
  expect(storedAttempt?.orderId).toBeUndefined();
  act(() => {
    unmount();
    client.clear();
  });
});
