import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import WishScreen from "@/app/(tabs)/wish";
import { getCurrentUser } from "@/features/auth/api";
import {
  getFollowedBrands,
  getRecentlyViewedProducts,
  getWishlist,
  removeWish,
  unfollowBrand,
} from "@/features/wish/api";
import { getLikedStylePosts, unlikeStylePost } from "@/features/style/api";
import type { StylePost } from "@/features/style/types";
import type { Action } from "@dadamjang/mobile";

const navigation: { path?: string } = {};
const actionButtonCalls: { actions: Action[] }[] = [];

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: (path: string) => {
      navigation.path = path;
    },
  }),
}));

jest.mock("@/shared/components", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    ActionButton: ({ actions }: { actions: Action[] }) => {
      actionButtonCalls.push({ actions });
      const action = actions[0];
      return action
        ? React.createElement(
            Pressable,
            { onPress: action.onPress, testID: "e2e.wish.cart" },
            React.createElement(
              Text,
              null,
              action.accessibilityLabel ?? action.label ?? action.icon?.sf,
            ),
          )
        : null;
    },
    Button: ({ children, label, onPress, testID }: { children?: ReactNode; label?: string; onPress: () => void; testID?: string }) =>
      React.createElement(
        Pressable,
        { onPress, testID },
        children ?? React.createElement(Text, null, label),
      ),
    TitleHeader: ({ children, title }: { children?: ReactNode; title: string }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, title),
        children,
      ),
  };
});

jest.mock("@/features/auth/api", () => ({ getCurrentUser: jest.fn() }));

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

jest.mock("@/features/style/api", () => ({
  createStylePost: jest.fn(),
  getLikedStylePosts: jest.fn(),
  getPurchasedStyleProducts: jest.fn(),
  getStylePost: jest.fn(),
  getStylePosts: jest.fn(),
  likeStylePost: jest.fn(),
  unlikeStylePost: jest.fn(),
  uploadStylePostImage: jest.fn(),
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
  TestWrapper.displayName = "WishLibraryScreenTestWrapper";
  return TestWrapper;
};

const product = {
  productId: "product-1",
  partnerId: "partner-1",
  brandId: "brand-1",
  brand: { brandId: "brand-1", name: "테스트 브랜드", slug: "test-brand" },
  categoryId: "category-1",
  title: "슈퍼세일 티셔츠",
  description: "상품 설명",
  imageUrls: [],
  status: "PUBLISHED",
  isOnSale: true,
  isExpressDelivery: true,
  skus: [
    {
      skuId: "sku-1",
      code: "sku-1",
      colorId: null,
      sizeId: null,
      optionName: "블랙 / M",
      price: 8_000,
      stock: 3,
    },
  ],
  createdAt: "2026-08-12T00:00:00.000Z",
};

const savedStylePost: StylePost = {
  stylePostId: "style-1",
  authorId: "user-1",
  author: { userId: "user-1", userid: "buyer" },
  title: "위시한 스타일",
  content: "스타일 설명",
  category: "CLOTHING",
  imageUrls: [],
  thumbnailUrl: null,
  hashtags: ["daily"],
  brandTags: [],
  products: [],
  isPartner: false,
  likeCount: 1,
  isLiked: true,
  createdAt: product.createdAt,
  updatedAt: product.createdAt,
};

describe("WISH library screen", () => {
  beforeEach(() => {
    navigation.path = undefined;
    actionButtonCalls.length = 0;
    jest.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      userid: "buyer",
      email: "buyer@example.com",
      role: "USER",
    });
    jest.mocked(getWishlist).mockResolvedValue([
      { wishId: "wish-1", productId: product.productId, createdAt: product.createdAt, product },
    ]);
    jest.mocked(getLikedStylePosts).mockResolvedValue({
      hasNextPage: false,
      nextCursor: null,
      nodes: [savedStylePost],
    });
    jest.mocked(getFollowedBrands).mockResolvedValue([
      { brandId: "brand-1", name: "테스트 브랜드", slug: "test-brand" },
    ]);
    jest.mocked(getRecentlyViewedProducts).mockResolvedValue([
      { productId: product.productId, viewedAt: product.createdAt, product },
    ]);
    jest.mocked(removeWish).mockResolvedValue(undefined);
    jest.mocked(unfollowBrand).mockResolvedValue(undefined);
    jest.mocked(unlikeStylePost).mockResolvedValue(savedStylePost);
  });

  it("uses one cart ActionButton and supports WISH tabs, controls, navigation, and removal", async () => {
    render(<WishScreen />, { wrapper: createWrapper() });

    await screen.findByTestId("e2e.product.open.product-1");
    expect(actionButtonCalls.length).toBeGreaterThan(0);
    expect(actionButtonCalls.every(({ actions }) => actions.length === 1)).toBe(true);
    expect(actionButtonCalls.at(-1)?.actions[0]?.icon).toEqual({
      md: "shopping_cart",
      sf: "cart",
    });
    expect(actionButtonCalls.at(-1)?.actions[0]?.accessibilityLabel).toBe(
      "장바구니",
    );

    await fireEvent.press(screen.getByTestId("e2e.wish.cart"));
    expect(navigation.path).toBe("/cart");

    await fireEvent.press(screen.getByTestId("e2e.wish.filter.sale"));
    await fireEvent.press(screen.getByTestId("e2e.wish.filter.sold-out"));
    await fireEvent.press(screen.getByTestId("e2e.wish.sort.open"));
    await fireEvent.press(await screen.findByTestId("e2e.wish.sort.low_price"));
    await fireEvent.press(screen.getByTestId("e2e.product.open.product-1"));
    expect(navigation.path).toBe("/product/product-1");

    await fireEvent.press(screen.getByTestId("e2e.wish.remove.product-1"));
    await waitFor(() => expect(jest.mocked(removeWish).mock.calls[0]?.[0]).toBe("product-1"));

    await fireEvent.press(screen.getByTestId("e2e.wish.tab.styles"));
    await fireEvent.press(await screen.findByLabelText("스타일 게시물 이미지"));
    expect(navigation.path).toBe("/style/style-1");
    await fireEvent.press(screen.getByLabelText("좋아요 취소"));
    await waitFor(() => expect(jest.mocked(unlikeStylePost).mock.calls[0]?.[0]).toBe("style-1"));

    await fireEvent.press(screen.getByTestId("e2e.wish.tab.brands"));
    await fireEvent.press(await screen.findByTestId("e2e.wish.brand.unfollow.brand-1"));
    await waitFor(() => expect(jest.mocked(unfollowBrand).mock.calls[0]?.[0]).toBe("brand-1"));

    await fireEvent.press(screen.getByTestId("e2e.wish.tab.recent"));
    await fireEvent.press(await screen.findByTestId("e2e.product.open.product-1"));
    expect(navigation.path).toBe("/product/product-1");
  });

  it("shows a sign-in CTA for signed-out users", async () => {
    jest.mocked(getCurrentUser).mockRejectedValueOnce(new Error("not authenticated"));
    render(<WishScreen />, { wrapper: createWrapper() });

    await fireEvent.press(await screen.findByTestId("e2e.wish.login"));

    expect(navigation.path).toBe("/auth");
  });
});
