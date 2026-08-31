import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import HomeScreen from "@/app/(tabs)";
import MyScreen from "@/app/(tabs)/my";
import ShopScreen from "@/app/(tabs)/shop";
import StyleScreen from "@/app/(tabs)/style";
import WishScreen from "@/app/(tabs)/wish";
import CompareScreen from "@/app/compare";
import { useAuthActionGate, useCurrentUser, useSignOut } from "@/features/auth";
import { useProductSearch } from "@/features/catalog";
import { useComparison, useComparisonActions } from "@/features/comparison";
import { useComparisonPriceSummaries } from "@/features/price-evidence";
import { SearchContent } from "@/shared/components/search-content";

const mockPush = jest.fn();
const mockWishAdd = jest.fn();

interface CapturedIconAction {
  accessibilityLabel: string;
  icon: { md: string; sf: string };
  onPress: () => void;
}

const mockProductLayouts: {
  headerActions: readonly CapturedIconAction[];
  variant: string;
}[] = [];
const mockActionButtonGroups: {
  actions: readonly CapturedIconAction[];
  variant: string;
}[] = [];
const mockActionButtons: {
  actions: readonly CapturedIconAction[];
  iconOnly?: boolean;
}[] = [];

jest.mock("expo-router", () => ({
  usePathname: () => "/shop",
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/features/auth", () => ({
  useAuthActionGate: jest.fn(),
  useCurrentUser: jest.fn(),
  useSignOut: jest.fn(),
}));

jest.mock("@/features/catalog", () => ({
  toProductFilter: jest.fn(() => ({})),
  useCategories: jest.fn(() => ({ data: [] })),
  useProductSearch: jest.fn(),
  useShopFilters: jest.fn(() => ({
    filters: { categoryId: undefined, sort: "RECOMMENDED" },
    startDraft: jest.fn(),
    updateFilters: jest.fn(),
  })),
}));

jest.mock("@/features/comparison", () => ({
  useComparison: jest.fn(),
  useComparisonActions: jest.fn(),
}));

jest.mock("@/features/price-evidence", () => ({
  priceEvidenceQueryKeys: {
    productPriceSummary: jest.fn(() => ["product-price-summary"]),
  },
  useComparisonPriceSummaries: jest.fn(),
  useProductPriceSummaries: jest.fn(() => ({
    data: { pages: [] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isLoading: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/features/shop", () => ({
  ShopCategoryBar: () => null,
  ShopFilterBar: () => null,
  ShopProductGrid: () => null,
  ShopSortBar: () => null,
}));

jest.mock("@/features/style", () => ({
  getStyleFeedFilter: jest.fn((_category, sort) => ({
    category: undefined,
    sort,
  })),
  styleQueryKeys: {
    posts: jest.fn(() => ["style-posts"]),
  },
  useStylePosts: jest.fn(() => ({
    data: { pages: [] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isLoading: false,
    refetch: jest.fn(),
  })),
  useToggleStylePostLike: jest.fn(() => ({ mutate: jest.fn() })),
}));

jest.mock("@/features/style/components", () => ({
  StyleCategoryBar: () => null,
  StylePostGrid: () => null,
  StyleSortBar: () => null,
}));

jest.mock("@/features/wish", () => ({
  WishBrandsTab: () => null,
  WishCategoryBar: () => null,
  WishProductsTab: () => null,
  WishRecentProductsTab: () => null,
  WishState: () => null,
  WishStylesTab: () => null,
  useWishActions: () => ({
    add: { mutate: mockWishAdd },
    remove: { mutate: jest.fn() },
  }),
  useWishlist: () => ({ data: [] }),
}));

jest.mock("@legendapp/list/react-native", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    LegendList: ({
      data,
      ListEmptyComponent,
      renderItem,
    }: {
      data: unknown[];
      ListEmptyComponent?: ReactNode;
      renderItem: ({ item }: { item: unknown }) => ReactNode;
    }) =>
      React.createElement(
        View,
        null,
        data.length === 0
          ? ListEmptyComponent
          : data.map((item, index) =>
              React.createElement(
                React.Fragment,
                { key: index },
                renderItem({ item }),
              ),
            ),
      ),
  };
});

jest.mock("@dadamjang/mobile", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    ActionButtonGroup: ({
      actions,
      variant,
    }: {
      actions: CapturedIconAction[];
      variant: string;
    }) => {
      mockActionButtonGroups.push({ actions, variant });
      return React.createElement(
        View,
        null,
        actions.map((action) =>
          React.createElement(Pressable, {
            accessibilityLabel: action.accessibilityLabel,
            accessibilityRole: "button",
            key: action.accessibilityLabel,
            onPress: action.onPress,
          }),
        ),
      );
    },
  };
});

jest.mock("@/shared/components", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    ActionButton: ({
      actions,
      iconOnly,
    }: {
      actions: CapturedIconAction[];
      iconOnly?: boolean;
    }) => {
      mockActionButtons.push({ actions, iconOnly });
      return React.createElement(
        View,
        null,
        actions.map((action) =>
          React.createElement(Pressable, {
            accessibilityLabel: action.accessibilityLabel,
            accessibilityRole: "button",
            key: action.accessibilityLabel,
            onPress: action.onPress,
          }),
        ),
      );
    },
    Button: ({
      children,
      label,
      onPress,
    }: {
      children?: ReactNode;
      label?: string;
      onPress: () => void;
    }) =>
      React.createElement(
        Pressable,
        { accessibilityRole: "button", onPress },
        children ?? React.createElement(Text, null, label),
      ),
    ProductCard: ({
      name,
      onPress,
      onToggleLike,
      productId,
    }: {
      name: string;
      onPress: () => void;
      onToggleLike: (nextLiked: boolean) => void;
      productId: string;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(
          Pressable,
          { onPress, testID: `e2e.product.open.${productId}` },
          React.createElement(Text, null, name),
        ),
        React.createElement(Pressable, {
          onPress: () => onToggleLike(true),
          testID: `e2e.wish.add.${productId}`,
        }),
      ),
    ProductLayout: ({
      children,
      headerActions,
      variant,
    }: {
      children: ReactNode;
      headerActions: CapturedIconAction[];
      variant: string;
    }) => {
      mockProductLayouts.push({ headerActions, variant });
      return React.createElement(
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
      );
    },
    TitleHeader: ({
      children,
      title,
    }: {
      children?: ReactNode;
      title: string;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, title),
        children,
      ),
  };
});

const product = {
  productId: "product-1",
  partnerId: "partner-1",
  brandId: null,
  brand: null,
  categoryId: "category-1",
  title: "리넨 셔츠",
  description: "여름 셔츠",
  imageUrls: ["https://cdn.example.com/product-1.jpg"],
  status: "ACTIVE",
  isOnSale: true,
  isExpressDelivery: false,
  skus: [
    {
      skuId: "sku-1",
      code: "SKU-1",
      colorId: null,
      sizeId: null,
      optionName: "M",
      price: 19_000,
      stock: 3,
    },
  ],
  createdAt: "2026-08-29T00:00:00.000Z",
};

const summary = {
  productId: "product-1",
  name: "리넨 셔츠",
  thumbnail: "https://cdn.example.com/product-1.jpg",
  basePrice: 25_000,
  finalPrice: 19_000,
  priceRevision: "revision-1",
  lowestPriceEvidenceSummary: "최근 최저가",
  isOnSale: true,
  isExpressDelivery: false,
};

describe("FO route completeness", () => {
  beforeEach(() => {
    mockActionButtonGroups.length = 0;
    mockActionButtons.length = 0;
    mockProductLayouts.length = 0;
    const currentUser = {
      authStatus: "authenticated",
      data: {
        userId: "user-1",
        userid: "buyer",
        email: "buyer@example.com",
        role: "USER",
      },
    };
    jest.mocked(useCurrentUser).mockReturnValue(currentUser as never);
    jest.mocked(useAuthActionGate).mockReturnValue({
      ...currentUser,
      isAuthenticated: true,
      redirectToSignIn: jest.fn(),
      runProtectedAction: (action: () => void) => {
        action();
        return true;
      },
    } as never);
    jest.mocked(useSignOut).mockReturnValue(jest.fn());
    jest.mocked(useProductSearch).mockReturnValue({
      data: {
        pages: [
          {
            hasNextPage: false,
            nextCursor: null,
            nodes: [product],
            totalCount: 1,
          },
        ],
      },
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
    } as never);
    jest.mocked(useComparison).mockReturnValue({
      data: [
        {
          comparisonItemId: "comparison-1",
          productId: "product-1",
          product,
          createdAt: "2026-08-29T00:00:00.000Z",
        },
        {
          comparisonItemId: "comparison-2",
          productId: "product-2",
          product: {
            ...product,
            productId: "product-2",
            title: "매칭 안 된 상품",
          },
          createdAt: "2026-08-29T00:00:00.000Z",
        },
      ],
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
    } as never);
    jest.mocked(useComparisonPriceSummaries).mockReturnValue({
      data: [summary],
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
    } as never);
    jest.mocked(useComparisonActions).mockReturnValue({
      remove: { mutate: jest.fn() },
    } as never);
  });

  it("routes every Home action to notifications, shop, or cart", async () => {
    const user = userEvent.setup();
    render(<HomeScreen />);

    await user.press(screen.getByRole("button", { name: "알림" }));
    await user.press(screen.getByRole("button", { name: "쇼핑" }));
    await user.press(screen.getByRole("button", { name: "장바구니" }));

    expect(mockPush.mock.calls.map(([path]) => path)).toEqual([
      "/notifications",
      "/(tabs)/shop",
      "/cart",
    ]);
    expect(useAuthActionGate).toHaveBeenCalledWith("/notifications");
  });

  it("shows the authenticated account and routes My header actions", async () => {
    const user = userEvent.setup();
    render(<MyScreen />);

    expect(screen.getByText("buyer")).toBeVisible();
    expect(screen.queryByText("로그아웃")).toBeNull();
    await user.press(screen.getByRole("button", { name: "주문 내역" }));
    await user.press(screen.getByRole("button", { name: "설정" }));
    await user.press(screen.getByRole("button", { name: "장바구니" }));

    expect(mockPush.mock.calls.map(([path]) => path)).toEqual([
      "/orders",
      "/settings",
      "/cart",
    ]);
  });

  it("renders the approved five-tab header action matrix", () => {
    const anyPress = expect.any(Function);
    const expectedCart = {
      accessibilityLabel: "장바구니",
      icon: { md: "shopping_cart", sf: "cart" },
      onPress: anyPress,
    };
    const renderedHome = render(<HomeScreen />);
    renderedHome.unmount();
    const renderedStyle = render(<StyleScreen />);
    renderedStyle.unmount();
    const renderedShop = render(<ShopScreen />);
    renderedShop.unmount();
    const renderedWish = render(<WishScreen />);
    renderedWish.unmount();
    const renderedMy = render(<MyScreen />);
    renderedMy.unmount();

    jest.mocked(useCurrentUser).mockReturnValue({
      authStatus: "unauthenticated",
      data: undefined,
    } as never);
    const renderedUnauthenticatedMy = render(<MyScreen />);
    renderedUnauthenticatedMy.unmount();

    mockPush.mockClear();
    mockProductLayouts.forEach(({ headerActions }) =>
      headerActions.forEach(({ onPress }) => onPress()),
    );
    mockActionButtons[0]?.actions.forEach(({ onPress }) => onPress());
    mockActionButtonGroups[0]?.actions.forEach(({ onPress }) => onPress());

    expect(mockProductLayouts).toEqual([
      {
        headerActions: [
          {
            accessibilityLabel: "알림",
            icon: { md: "notifications", sf: "bell" },
            onPress: anyPress,
          },
          expectedCart,
        ],
        variant: "capsule",
      },
      {
        headerActions: [
          {
            accessibilityLabel: "스타일 등록",
            icon: { md: "add", sf: "plus" },
            onPress: anyPress,
          },
          expectedCart,
        ],
        variant: "circularPair",
      },
      {
        headerActions: [
          {
            accessibilityLabel: "쇼핑 메뉴",
            icon: { md: "menu", sf: "line.3.horizontal" },
            onPress: anyPress,
          },
          expectedCart,
        ],
        variant: "capsule",
      },
    ]);
    expect(mockActionButtons).toEqual([
      { actions: [expectedCart], iconOnly: true },
    ]);
    expect(mockActionButtonGroups).toEqual([
      {
        actions: [
          {
            accessibilityLabel: "설정",
            icon: { md: "settings", sf: "gearshape" },
            onPress: anyPress,
          },
          expectedCart,
        ],
        variant: "circularPair",
      },
      {
        actions: [
          {
            accessibilityLabel: "설정",
            icon: { md: "settings", sf: "gearshape" },
            onPress: anyPress,
          },
          expectedCart,
        ],
        variant: "circularPair",
      },
    ]);
    expect(mockPush.mock.calls.map(([path]) => path)).toEqual([
      "/notifications",
      "/cart",
      "/style-compose",
      "/cart",
      "/shop-menu-sheet",
      "/cart",
      "/cart",
      "/settings",
      "/cart",
    ]);
  });

  it("renders keyword results and opens a product", async () => {
    const user = userEvent.setup();
    render(<SearchContent keyword="리넨" />);

    expect(screen.getByText('"리넨" 검색 결과')).toBeVisible();
    expect(screen.getByText("리넨 셔츠")).toBeVisible();
    await user.press(screen.getByTestId("e2e.product.open.product-1"));
    expect(mockPush).toHaveBeenCalledWith("/product/product-1");
  });

  it("routes unauthenticated search wishes to sign-in without mutating", async () => {
    const redirectToSignIn = jest.fn();
    jest.mocked(useAuthActionGate).mockReturnValue({
      authStatus: "unauthenticated",
      data: undefined,
      isAuthenticated: false,
      redirectToSignIn,
      runProtectedAction: (action: () => void) => {
        void action;
        redirectToSignIn();
        return false;
      },
    } as never);
    const user = userEvent.setup();
    render(<SearchContent keyword="리넨" />);

    await user.press(screen.getByTestId("e2e.wish.add.product-1"));

    expect(mockWishAdd).not.toHaveBeenCalled();
    expect(redirectToSignIn).toHaveBeenCalledTimes(1);
  });

  it("shows search error retry and empty states", () => {
    const refetch = jest.fn();
    jest.mocked(useProductSearch).mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      refetch,
    } as never);
    const rendered = render(<SearchContent keyword="리넨" />);

    fireEvent.press(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetch).toHaveBeenCalledTimes(1);

    jest.mocked(useProductSearch).mockReturnValue({
      data: {
        pages: [
          { hasNextPage: false, nextCursor: null, nodes: [], totalCount: 0 },
        ],
      },
      isError: false,
      isLoading: false,
      refetch,
    } as never);
    rendered.rerender(<SearchContent keyword="리넨" />);
    expect(screen.getByText("검색 결과가 없어요.")).toBeVisible();
  });

  it("renders only matching comparison summaries with open and remove actions", async () => {
    const remove = jest.fn();
    jest
      .mocked(useComparisonActions)
      .mockReturnValue({ remove: { mutate: remove } } as never);
    const user = userEvent.setup();
    render(<CompareScreen />);

    expect(screen.getByText("리넨 셔츠")).toBeVisible();
    expect(screen.queryByText("매칭 안 된 상품")).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "리넨 셔츠 열기" }));
    await user.press(
      screen.getByRole("button", { name: "리넨 셔츠 비교에서 삭제" }),
    );

    expect(mockPush).toHaveBeenCalledWith("/product/product-1");
    expect(remove).toHaveBeenCalledWith("product-1");
  });
});
