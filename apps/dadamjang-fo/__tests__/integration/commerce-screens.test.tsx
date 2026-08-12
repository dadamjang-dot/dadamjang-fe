import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/features/auth/api";
import { getCart, checkoutCart } from "@/features/cart/api";
import CartScreen from "@/app/cart";
import WishScreen from "@/app/(tabs)/wish";
import { getWishlist } from "@/features/wish/api";

const mockNavigation: { path?: string } = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    push: (path: string) => {
      mockNavigation.path = path;
    },
    replace: (path: string) => {
      mockNavigation.path = path;
    },
  }),
}));

jest.mock("@/shared/components", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    TitleHeader: ({ title }: { title: string }) => React.createElement(Text, null, title),
  };
});

jest.mock("@/features/auth/api", () => ({
  getCurrentUser: jest.fn(),
}));

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

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = "CommerceScreenTestWrapper";
  return TestWrapper;
};

const cart = {
  cartId: "cart-1",
  totalAmount: 8_000,
  items: [
    {
      cartItemId: "cart-item-1",
      quantity: 1,
      sku: { skuId: "sku-1", optionName: "블랙 / M", price: 8_000 },
      product: { productId: "product-1", title: "테스트 상품", imageUrls: [] },
    },
  ],
};

const wishlist = [
  {
    wishId: "wish-1",
    productId: "product-1",
    createdAt: "2026-08-12T00:00:00.000Z",
    product: {
      productId: "product-1",
      partnerId: "partner-1",
      brandId: null,
      categoryId: "category-1",
      title: "테스트 상품",
      description: "상품 설명",
      imageUrls: [],
      status: "ACTIVE",
      isOnSale: true,
      isExpressDelivery: false,
      skus: [
        {
          skuId: "sku-1",
          code: "sku-1",
          colorId: null,
          sizeId: null,
          optionName: "블랙 / M",
          price: 8_000,
          stock: 10,
        },
      ],
      createdAt: "2026-08-12T00:00:00.000Z",
    },
  },
];

describe("cart and wish screens", () => {
  beforeEach(() => {
    mockNavigation.path = undefined;
    jest.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      userid: "buyer",
      email: "buyer@example.com",
      role: "USER",
    });
    jest.mocked(getCart).mockResolvedValue(cart);
    jest.mocked(getWishlist).mockResolvedValue(wishlist);
  });

  afterEach(() => {
    delete mockNavigation.path;
  });

  it("opens an order route after a successful cart checkout", async () => {
    jest.mocked(checkoutCart).mockResolvedValue({
      orderId: "order-1",
      orderNumber: "20260812-1",
      status: "PAID",
      paymentStatus: "PAID",
      totalAmount: 8_000,
    });
    render(<CartScreen />, { wrapper: createWrapper() });

    await fireEvent.press(await screen.findByTestId("e2e.checkout.submit"));

    await waitFor(() => expect(mockNavigation.path).toBe("/order/order-1"));
  });

  it("shows the checkout failure state when payment is rejected", async () => {
    jest.mocked(checkoutCart).mockRejectedValueOnce(new Error("payment failed"));
    render(<CartScreen />, { wrapper: createWrapper() });

    await fireEvent.press(await screen.findByTestId("e2e.checkout.submit"));

    expect(await screen.findByTestId("e2e.checkout.failure")).toBeVisible();
  });

  it("opens a product route from a rendered wish item", async () => {
    render(<WishScreen />, { wrapper: createWrapper() });

    await fireEvent.press(await screen.findByTestId("e2e.product.open.product-1"));

    expect(mockNavigation.path).toBe("/product/product-1");
    expect(screen.getByText("테스트 상품")).toBeVisible();
  });
});
