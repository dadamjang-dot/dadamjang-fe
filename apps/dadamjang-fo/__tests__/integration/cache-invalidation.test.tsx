import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import * as Crypto from "expo-crypto";
import type { ReactNode } from "react";

import { checkoutCart, upsertCartItem } from "@/features/cart/api";
import { useCartActions } from "@/features/cart/hooks";
import { addWish } from "@/features/wish/api";
import { useWishActions } from "@/features/wish/hooks";

jest.mock("@/features/cart/api", () => ({
  checkoutCart: jest.fn(),
  getCart: jest.fn(),
  removeCartItem: jest.fn(),
  upsertCartItem: jest.fn(),
}));

jest.mock("@/features/wish/api", () => ({
  addWish: jest.fn(),
  getWishlist: jest.fn(),
  removeWish: jest.fn(),
}));

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });

const createWrapper = (client: QueryClient) => {
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = "CacheTestWrapper";
  return TestWrapper;
};

describe("mutation cache invalidation", () => {
  it("invalidates cart and order list after checkout", async () => {
    const client = createClient();
    client.setQueryData(["cart"], { items: [] });
    client.setQueryData(["orders"], []);
    jest.mocked(checkoutCart).mockResolvedValueOnce({
      orderId: "order-1",
      orderNumber: "20260812-1",
      paymentStatus: "APPROVED",
      status: "PAID",
      totalAmount: 10_000,
    });
    const { result, unmount } = renderHook(useCartActions, { wrapper: createWrapper(client) });

    await act(async () => {
      await result.current.checkout.mutateAsync({ idempotencyKey: "checkout-1" });
    });

    expect(client.getQueryState(["cart"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["orders"])?.isInvalidated).toBe(true);
    act(() => {
      unmount();
      client.clear();
    });
  });

  it("invalidates wishlist after adding a product", async () => {
    const client = createClient();
    client.setQueryData(["wishlist"], []);
    jest.mocked(addWish).mockResolvedValueOnce(undefined);
    const { result, unmount } = renderHook(useWishActions, { wrapper: createWrapper(client) });

    await act(async () => {
      await result.current.add.mutateAsync("product-1");
    });

    expect(client.getQueryState(["wishlist"])?.isInvalidated).toBe(true);
    act(() => {
      unmount();
      client.clear();
    });
  });

  it("reuses one checkout key through retries and rotates it after success", async () => {
    const client = createClient();
    jest
      .mocked(Crypto.randomUUID)
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000002");
    jest
      .mocked(checkoutCart)
      .mockRejectedValueOnce(new Error("payment failed"))
      .mockResolvedValue({
        orderId: "order-1",
        orderNumber: "20260829-1",
        paymentStatus: "APPROVED",
        status: "PAID",
        totalAmount: 10_000,
      });
    const { result, unmount } = renderHook(useCartActions, {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await expect(result.current.checkout.mutateAsync(undefined)).rejects.toThrow(
        "payment failed",
      );
      await result.current.checkout.mutateAsync(undefined);
      await result.current.checkout.mutateAsync(undefined);
    });

    expect(checkoutCart).toHaveBeenNthCalledWith(1, {
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
    });
    expect(checkoutCart).toHaveBeenNthCalledWith(2, {
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
    });
    expect(checkoutCart).toHaveBeenNthCalledWith(3, {
      idempotencyKey: "00000000-0000-4000-8000-000000000002",
    });
    act(() => {
      unmount();
      client.clear();
    });
  });

  it("rotates the checkout key after a cart-changing mutation", async () => {
    const client = createClient();
    jest
      .mocked(Crypto.randomUUID)
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000011")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000012");
    jest.mocked(checkoutCart).mockRejectedValue(new Error("payment failed"));
    jest.mocked(upsertCartItem).mockResolvedValue({});
    const { result, unmount } = renderHook(useCartActions, {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await expect(result.current.checkout.mutateAsync(undefined)).rejects.toThrow(
        "payment failed",
      );
      await result.current.upsert.mutateAsync({ skuId: "sku-1", quantity: 2 });
      await expect(result.current.checkout.mutateAsync(undefined)).rejects.toThrow(
        "payment failed",
      );
    });

    expect(checkoutCart).toHaveBeenNthCalledWith(1, {
      idempotencyKey: "00000000-0000-4000-8000-000000000011",
    });
    expect(checkoutCart).toHaveBeenNthCalledWith(2, {
      idempotencyKey: "00000000-0000-4000-8000-000000000012",
    });
    act(() => {
      unmount();
      client.clear();
    });
  });
});
