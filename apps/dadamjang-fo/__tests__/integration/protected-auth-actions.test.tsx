import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import ShopScreen from "@/app/(tabs)/shop";
import StyleScreen from "@/app/(tabs)/style";
import CartScreen from "@/app/cart";
import CompareScreen from "@/app/compare";
import OrdersScreen from "@/app/orders";
import ProductScreen from "@/app/product/[product-id]";
import StylePostScreen from "@/app/style/[style-id]";
import { AuthSessionStateProvider } from "@/features/auth/auth-session-state";
import { getCurrentUser } from "@/features/auth/api";
import { getCart, upsertCartItem } from "@/features/cart/api";
import { getCategories, getProduct } from "@/features/catalog/api";
import { ShopFiltersProvider } from "@/features/catalog/shop-filters";
import { getComparison } from "@/features/comparison/api";
import { getOrders } from "@/features/order/api";
import {
  getComparisonPriceSummaries,
  getProductPriceSummaries,
  getProductPriceSummary,
} from "@/features/price-evidence/api";
import {
  getStylePost,
  getStylePosts,
  likeStylePost,
} from "@/features/style/api";
import type { StylePost } from "@/features/style/types";
import { addWish, followBrand, getFollowedBrands, getWishlist } from "@/features/wish/api";

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockPathname = "/";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({
    "product-id": "product-1",
    "style-id": "style-1",
  }),
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
  getProductPriceSummary: jest.fn(),
}));

jest.mock("@/features/style/api", () => ({
  createStylePost: jest.fn(),
  getLikedStylePosts: jest.fn(),
  getPurchasedStyleProducts: jest.fn(),
  getStylePost: jest.fn(),
  getStylePosts: jest.fn(),
  likeStylePost: jest.fn(),
  unlikeStylePost: jest.fn(),
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

jest.mock("@/features/style/components", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    StyleCategoryBar: () => null,
    StylePostDetail: ({
      onToggleLike,
    }: {
      onToggleLike: (nextLiked: boolean) => void;
    }) =>
      React.createElement(Pressable, {
        accessibilityLabel: "스타일 상세 좋아요",
        accessibilityRole: "button",
        onPress: () => onToggleLike(true),
      }),
    StylePostGrid: ({
      isLoading,
      onToggleLike,
    }: {
      isLoading: boolean;
      onToggleLike: (stylePostId: string, nextLiked: boolean) => void;
    }) =>
      React.createElement(
        View,
        null,
        isLoading ? null : React.createElement(Text, null, "스타일 피드 준비"),
        React.createElement(Pressable, {
          accessibilityLabel: "스타일 피드 좋아요",
          accessibilityRole: "button",
          onPress: () => onToggleLike("style-1", true),
        }),
      ),
    StyleSortBar: () => null,
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
    ProductLayout: ({
      children,
      headerActions = [],
    }: {
      children: ReactNode;
      headerActions?: readonly {
        accessibilityLabel: string;
        onPress: () => void;
      }[];
    }) =>
      React.createElement(
        View,
        null,
        ...headerActions.map((action) =>
          React.createElement(Pressable, {
            accessibilityLabel: action.accessibilityLabel,
            accessibilityRole: "button",
            key: action.accessibilityLabel,
            onPress: action.onPress,
          }),
        ),
        children,
      ),
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

const stylePost: StylePost = {
  stylePostId: "style-1",
  authorId: "user-1",
  author: { userId: "user-1", userid: "buyer" },
  title: "스타일 게시물",
  content: "오늘의 스타일",
  category: "CLOTHING",
  imageUrls: ["https://example.com/style.jpg"],
  thumbnailUrl: "https://example.com/style.jpg",
  hashtags: [],
  brandTags: [],
  products: [],
  isPartner: false,
  likeCount: 2,
  isLiked: false,
  createdAt: "2026-08-29T00:00:00.000Z",
  updatedAt: "2026-08-29T00:00:00.000Z",
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
    jest.mocked(getProductPriceSummaries).mockResolvedValue({
      nodes: [],
      totalCount: 0,
      nextCursor: null,
      hasNextPage: false,
    });
    jest.mocked(getProductPriceSummary).mockResolvedValue({
      productId: product.productId,
      name: product.title,
      thumbnail: null,
      isOnSale: product.isOnSale,
      isExpressDelivery: product.isExpressDelivery,
      basePrice: 10_000,
      finalPrice: 10_000,
      priceRevision: "revision-1",
      lowestPriceEvidenceSummary: "현재 옵션 최저가 기준",
    });
    jest.mocked(getStylePost).mockResolvedValue(stylePost);
    jest.mocked(getStylePosts).mockResolvedValue({
      hasNextPage: false,
      nextCursor: null,
      nodes: [stylePost],
    });
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

  it("gates Style feed actions with their exact return targets", async () => {
    mockPathname = "/style";
    const user = userEvent.setup();
    render(<StyleScreen />, { wrapper: createWrapper() });

    expect(await screen.findByText("스타일 피드 준비")).toBeVisible();
    await user.press(screen.getByRole("button", { name: "스타일 작성" }));
    await user.press(
      screen.getByRole("button", { name: "스타일 피드 좋아요" }),
    );

    expect(likeStylePost).not.toHaveBeenCalled();
    expect(mockPush.mock.calls).toEqual([
      [
        {
          pathname: "/auth/signin",
          params: { returnTo: "/style-compose" },
        },
      ],
      [
        {
          pathname: "/auth/signin",
          params: { returnTo: "/style/style-1" },
        },
      ],
    ]);
  });

  it("gates Style detail likes on the exact detail return target", async () => {
    mockPathname = "/style/style-1";
    const user = userEvent.setup();
    render(<StylePostScreen />, { wrapper: createWrapper() });

    await user.press(
      await screen.findByRole("button", { name: "스타일 상세 좋아요" }),
    );

    expect(likeStylePost).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/auth/signin",
      params: { returnTo: "/style/style-1" },
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
