import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";

import { getCart } from "@/features/cart/api";
import { useCart } from "@/features/cart/hooks";
import { getWishlist } from "@/features/wish/api";
import { useWishlist } from "@/features/wish/hooks";

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

const clients: QueryClient[] = [];

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
  clients.push(client);
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = "QueryStateTestWrapper";
  return TestWrapper;
};

afterEach(() => clients.splice(0).forEach((client) => client.clear()));

const CartState = () => {
  const cart = useCart();
  if (cart.isLoading) return <Text>cart-loading</Text>;
  if (cart.isError) return <Pressable onPress={() => cart.refetch()}><Text>cart-retry</Text></Pressable>;
  return <Text>{`cart-items-${cart.data?.items.length ?? 0}`}</Text>;
};
CartState.displayName = "CartState";

const WishState = () => {
  const wishlist = useWishlist();
  if (wishlist.isLoading) return <Text>wish-loading</Text>;
  if (wishlist.isError) return <Pressable onPress={() => wishlist.refetch()}><Text>wish-retry</Text></Pressable>;
  return <Text>{`wish-items-${wishlist.data?.length ?? 0}`}</Text>;
};
WishState.displayName = "WishState";

describe("cart and wish query states", () => {
  it("shows cart error and recovers through retry", async () => {
    jest.mocked(getCart)
      .mockRejectedValueOnce(new Error("cart unavailable"))
      .mockResolvedValueOnce({ cartId: "cart-1", items: [], totalAmount: 0 });
    render(<CartState />, { wrapper: createWrapper() });

    await fireEvent.press(await screen.findByText("cart-retry"));

    expect(await screen.findByText("cart-items-0")).toBeVisible();
  });

  it("shows wish loading while the request remains pending", () => {
    jest.mocked(getWishlist).mockImplementationOnce(() => new Promise(() => undefined));
    render(<WishState />, { wrapper: createWrapper() });

    expect(screen.getByText("wish-loading")).toBeVisible();
  });

  it("shows wish error and recovers through retry", async () => {
    jest.mocked(getWishlist)
      .mockRejectedValueOnce(new Error("wish unavailable"))
      .mockResolvedValueOnce([]);
    render(<WishState />, { wrapper: createWrapper() });

    await fireEvent.press(await screen.findByText("wish-retry"));

    expect(await screen.findByText("wish-items-0")).toBeVisible();
  });
});
