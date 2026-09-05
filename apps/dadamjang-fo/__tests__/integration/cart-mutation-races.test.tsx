import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { getSessionGeneration } from "@dadamjang/graphql-client";
import {
  checkoutCart,
  getCart,
  removeCartItem,
  upsertCartItem,
} from "@/features/cart/api";
import { useCart, useCartActions } from "@/features/cart/hooks";

jest.mock("@/features/cart/api", () => ({
  checkoutCart: jest.fn(),
  getCart: jest.fn(),
  removeCartItem: jest.fn(),
  upsertCartItem: jest.fn(),
}));
jest.mock("@dadamjang/graphql-client", () => ({
  getSessionGeneration: jest.fn(() => 0),
}));
beforeEach(() => jest.mocked(getSessionGeneration).mockReturnValue(0));

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const setup = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  client.setQueryData(["cart"], { cartId: "cart", items: [], totalAmount: 0 });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper: Wrapper };
};

it.each(["mutate", "mutateAsync"] as const)(
  "does not notify the old caller when %s finishes refetch after session replacement",
  async (method) => {
    const { client, wrapper } = setup();
    const refresh = deferred();
    const navigation: string[] = [];
    let refetchStarted = false;
    jest.mocked(getCart).mockImplementation(async () => {
      refetchStarted = true;
      await refresh.promise;
      return { cartId: "cart", items: [], totalAmount: 0 };
    });
    jest
      .mocked(checkoutCart)
      .mockResolvedValue({
        orderId: "old-order",
        orderNumber: "1",
        status: "PAID",
        paymentStatus: "APPROVED",
        totalAmount: 1,
      });
    const { result, unmount } = renderHook(
      () => ({ cart: useCart(), actions: useCartActions() }),
      { wrapper },
    );
    let outcome: Promise<string> | undefined;
    await act(async () => {
      const options = {
        onSuccess: () => {
          navigation.push("old-order");
        },
        onError: () => {
          navigation.push("old-error");
        },
        onSettled: () => {
          navigation.push("old-settled");
        },
      };
      if (method === "mutateAsync")
        outcome = result.current.actions.checkout
          .mutateAsync(undefined, options)
          .then(
            () => "success",
            () => "rejected",
          );
      else result.current.actions.checkout.mutate(undefined, options);
    });
    await waitFor(() => expect(refetchStarted).toBe(true));
    await act(async () => {
      jest.mocked(getSessionGeneration).mockReturnValue(1);
      refresh.resolve();
      if (outcome) await outcome;
    });
    await waitFor(() => expect(client.isMutating()).toBe(0));
    expect(navigation).toEqual([]);
    if (outcome) expect(await outcome).toBe("rejected");
    act(() => {
      unmount();
      client.clear();
    });
  },
);

it("blocks checkout and duplicate absolute edits until the cart refresh settles", async () => {
  const { client, wrapper } = setup();
  const write = deferred();
  const refresh = deferred();
  let quantity = 1;
  const ordered: number[] = [];
  const acceptedWrites: number[] = [];
  jest.mocked(upsertCartItem).mockImplementation(async (_id, next) => {
    await write.promise;
    quantity = next;
    acceptedWrites.push(next);
    return {};
  });
  jest.mocked(getCart).mockImplementation(async () => {
    await refresh.promise;
    return { cartId: "cart", items: [], totalAmount: quantity };
  });
  jest.mocked(checkoutCart).mockImplementation(async () => {
    ordered.push(quantity);
    return {
      orderId: "order",
      orderNumber: "1",
      status: "PAID",
      paymentStatus: "APPROVED",
      totalAmount: quantity,
    };
  });
  const { result, unmount } = renderHook(
    () => ({
      cart: useCart(),
      first: useCartActions(),
      second: useCartActions(),
    }),
    { wrapper },
  );
  let edit!: Promise<unknown>;
  let duplicate!: Promise<unknown>;
  let earlyCheckout!: Promise<unknown>;
  await act(async () => {
    edit = result.current.first.upsert.mutateAsync({
      skuId: "sku",
      quantity: 2,
    });
    duplicate = result.current.second.upsert
      .mutateAsync({ skuId: "sku", quantity: 2 })
      .catch(() => undefined);
    earlyCheckout = result.current.second.checkout
      .mutateAsync(undefined)
      .catch(() => undefined);
  });
  await act(async () => {
    write.resolve();
  });
  let refreshCheckout!: Promise<unknown>;
  await act(async () => {
    refreshCheckout = result.current.second.checkout
      .mutateAsync(undefined)
      .catch(() => undefined);
  });
  const earlyOrders = [...ordered];
  await act(async () => {
    refresh.resolve();
    await Promise.all([edit, duplicate, earlyCheckout, refreshCheckout]);
  });
  expect(acceptedWrites).toEqual([2]);
  expect(earlyOrders).toEqual([]);
  await act(async () => {
    await result.current.second.checkout.mutateAsync(undefined);
  });
  expect(ordered).toEqual([2]);
  act(() => {
    unmount();
    client.clear();
  });
});

it("does not recreate or remove cart items while checkout is pending", async () => {
  const { client, wrapper } = setup();
  const payment = deferred();
  let quantity = 1;
  jest.mocked(checkoutCart).mockImplementation(async () => {
    quantity = 0;
    await payment.promise;
    return {
      orderId: "order",
      orderNumber: "1",
      status: "PAID",
      paymentStatus: "APPROVED",
      totalAmount: 1,
    };
  });
  jest.mocked(upsertCartItem).mockImplementation(async (_id, next) => {
    quantity = next;
    return {};
  });
  jest.mocked(removeCartItem).mockImplementation(async () => {
    quantity = -1;
    return { removeCartItem: { cartId: "cart" } };
  });
  const { result, unmount } = renderHook(
    () => ({ first: useCartActions(), second: useCartActions() }),
    { wrapper },
  );
  let checkout!: Promise<unknown>;
  await act(async () => {
    checkout = result.current.first.checkout.mutateAsync(undefined);
  });
  await act(async () => {
    await result.current.second.upsert
      .mutateAsync({ skuId: "sku", quantity: 2 })
      .catch(() => undefined);
    await result.current.second.remove
      .mutateAsync("sku")
      .catch(() => undefined);
    payment.resolve();
    await checkout;
  });
  expect(quantity).toBe(0);
  act(() => {
    unmount();
    client.clear();
  });
});
