import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import ShopScreen from "@/app/(tabs)/shop";
import CartScreen from "@/app/cart";
import CompareScreen from "@/app/compare";
import OrdersScreen from "@/app/orders";
import ProductScreen from "@/app/product/[product-id]";
import { AuthSessionStateProvider } from "@/features/auth/auth-session-state";
import { getCurrentUser } from "@/features/auth/api";
import { getCart, upsertCartItem } from "@/features/cart/api";
import { getCategories, getProduct } from "@/features/catalog/api";
import { ShopFiltersProvider } from "@/features/catalog/shop-filters";
import { getComparison } from "@/features/comparison/api";
import { getOrders } from "@/features/order/api";
import { getComparisonPriceSummaries } from "@/features/price-evidence/api";
import { addWish, followBrand, getFollowedBrands, getWishlist } from "@/features/wish/api";

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockPathname = "/";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ "product-id": "product-1" }),
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock("@/features/auth/api", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/features/cart/api", () => ({
  checkoutCart: jest.fn(),
  getCart: jest.fn(),
  removeCartItem: jest.fn(),
  upsertCartItem: jest.fn(),
}));

jest.mock("@/features/catalog/api", () => ({
  getCategories: jest.fn(),
  getProduct: jest.fn(),
  getProducts: jest.fn(),
  productFields: "productId",
}));

jest.mock("@/features/comparison/api", () => ({
  addComparisonItem: jest.fn(),
  getComparison: jest.fn(),
  removeComparisonItem: jest.fn(),
}));

jest.mock("@/features/order/api", () => ({
  getOrder: jest.fn(),
  getOrders: jest.fn(),
}));

jest.mock("@/features/price-evidence/api", () => ({
  getComparisonPriceSummaries: jest.fn(),
  getProductPriceEvidence: jest.fn(),
  getProductPriceSummaries: jest.fn(),
}));

jest.mock("@/features/wish/api", () => ({
  addWish: jest.fn(),
  followBrand: jest.fn(),
  getFollowedBrands: jest.fn(),
  getRecentlyViewedProducts: jest.fn(),
  getWishlist: jest.fn(),
  recordRecentProductView: jest.fn(),
  removeWish: jest.fn(),
  unfollowBrand: jest.fn(),
}));

jest.mock("@/features/shop", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    ShopCategoryBar: () => null,
    ShopFilterBar: () => null,
    ShopProductGrid: ({
      onToggleLike,
    }: {
      onToggleLike: (productId: string, nextLiked: boolean) => void;
    }) =>
      React.createElement(Pressable, {
        onPress: () => onToggleLike("product-1", true),
        testID: "shop.toggle-wish",
      }),
    ShopSortBar: () => null,
  };
});

jest.mock("@/shared/components", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { accessibilityLabel: label, accessibilityRole: "button", onPress },
        React.createElement(Text, null, label),
      ),
    ProductLayout: ({ children }: { children: ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock("@legendapp/list/react-native", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    LegendList: ({
      data,
      ListFooterComponent,
      ListHeaderComponent,
      renderItem,
    }: {
      data: unknown[];
      ListFooterComponent?: ReactNode;
      ListHeaderComponent?: ReactNode;
      renderItem: ({ item }: { item: unknown }) => ReactNode;
    }) =>
      React.createElement(
        View,
        null,
        ListHeaderComponent,
        ...data.map((item, index) =>
          React.createElement(
            React.Fragment,
            { key: index },
            renderItem({ item }),
          ),
        ),
        ListFooterComponent,
      ),
  };
});

const product = {
  productId: "product-1",
  partnerId: "partner-1",
  brandId: "brand-1",
  brand: { brandId: "brand-1", name: "테스트 브랜드", slug: "test-brand" },
  categoryId: "category-1",
  title: "테스트 상품",
  description: "상품 설명",
  imageUrls: [],
  status: "ACTIVE",
  isOnSale: false,
  isExpressDelivery: false,
  skus: [
    {
      skuId: "sku-1",
      code: "SKU-1",
      colorId: null,
      sizeId: null,
      optionName: "M",
      price: 10_000,
      stock: 3,
    },
  ],
  createdAt: "2026-08-29T00:00:00.000Z",
};

const createWrapper = (hasSession = false) => {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthSessionStateProvider
        value={{ error: null, hasSession, retry: async () => undefined }}
      >
        <ShopFiltersProvider>{children}</ShopFiltersProvider>
      </AuthSessionStateProvider>
    </QueryClientProvider>
  );
  TestWrapper.displayName = "ProtectedAuthTestWrapper";
  return TestWrapper;
};

describe("protected FO routes and actions", () => {
  beforeEach(() => {
    jest.mocked(getCategories).mockResolvedValue([]);
    jest.mocked(getCart).mockResolvedValue({ cartId: "cart-1", items: [], totalAmount: 0 });
    jest.mocked(getOrders).mockResolvedValue([]);
    jest.mocked(getProduct).mockResolvedValue(product);
    jest.mocked(getComparison).mockResolvedValue([]);
    jest.mocked(getComparisonPriceSummaries).mockResolvedValue([]);
    jest.mocked(getFollowedBrands).mockResolvedValue([]);
    jest.mocked(getWishlist).mockResolvedValue([]);
  });

  it.each([
    ["/cart", CartScreen, getCart],
    ["/orders", OrdersScreen, getOrders],
    ["/compare", CompareScreen, getComparison],
  ])("redirects %s without starting its protected query", async (path, Screen, query) => {
    mockPathname = path;
    render(<Screen />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/auth/signin",
        params: { returnTo: path },
      }),
    );
    expect(query).not.toHaveBeenCalled();
    if (path === "/compare")
      expect(getComparisonPriceSummaries).not.toHaveBeenCalled();
  });

  it("gates add-to-cart and brand follow on the original product route", async () => {
    mockPathname = "/product/product-1";
    render(<ProductScreen />, { wrapper: createWrapper() });

    await fireEvent.press(await screen.findByTestId("e2e.cart.add"));
    await fireEvent.press(
      screen.getByTestId("e2e.product.brand.follow.brand-1"),
    );

    expect(upsertCartItem).not.toHaveBeenCalled();
    expect(followBrand).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: "/auth/signin",
      params: { returnTo: "/product/product-1" },
    });
  });

  it("gates Shop wish mutations on the original Shop route", () => {
    mockPathname = "/shop";
    render(<ShopScreen />, { wrapper: createWrapper() });

    fireEvent.press(screen.getByTestId("shop.toggle-wish"));

    expect(addWish).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/auth/signin",
      params: { returnTo: "/shop" },
    });
  });

  it("keeps a hydrating Cart in its loading state without querying or redirecting", () => {
    mockPathname = "/cart";
    jest.mocked(getCurrentUser).mockImplementation(() => new Promise(() => undefined));
    render(<CartScreen />, { wrapper: createWrapper(true) });

    expect(screen.getByText("로그인 상태를 확인하고 있어요.")).toBeVisible();
    expect(getCart).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
