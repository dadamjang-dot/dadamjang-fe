import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { checkoutCart } from "@/features/cart/api";
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
});
