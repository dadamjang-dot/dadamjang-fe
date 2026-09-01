import { renderAsync, screen, userEvent } from "@testing-library/react-native";
import type { ComponentType, ReactNode } from "react";
import { View } from "react-native";

import { ActionButton, type IconAction } from "@dadamjang/mobile";
import HomeScreen from "../src/app/(tabs)";
import TabLayout from "../src/app/(tabs)/_layout";
import { defaultShopFilters } from "../src/features/catalog/shop-filters";
import ShopFilterBar from "../src/features/shop/components/shop-filter-bar";
import StylePostCard from "../src/features/style/components/style-post-card";
import StylePostDetail from "../src/features/style/components/style-post-detail";
import type { StylePost } from "../src/features/style/types";
import WishProductCard from "../src/features/wish/components/wish-product-card";
import { ProductLayout } from "../src/shared/components/product-layout";

jest.mock("expo-image", () => ({ Image: "ExpoImage" }));

const mockPush = jest.fn();
const mockRunProtectedAction = jest.fn((action: () => void) => {
  action();
  return true;
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/features/auth", () => ({
  useAuthActionGate: () => ({ runProtectedAction: mockRunProtectedAction }),
}));

jest.mock("@/shared/components", () => ({
  ...jest.requireActual("./mocks/shared-components"),
  ProductLayout: ({
    children,
    headerActions,
    variant,
  }: {
    children: ReactNode;
    headerActions: readonly IconAction[];
    variant: "capsule" | "circularPair";
  }) => {
    const React = jest.requireActual<typeof import("react")>("react");
    const { View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    const { ActionButtonGroup } = jest.requireActual("@dadamjang/mobile");
    return React.createElement(
      View,
      null,
      React.createElement(ActionButtonGroup, {
        actions: headerActions,
        variant,
      }),
      children,
    );
  },
}));

jest.useFakeTimers();

const materialIconSource = 1;

const notificationAction = (onPress: () => void): IconAction => ({
  accessibilityLabel: "알림",
  icon: { md: "notifications", sf: "bell" },
  onPress,
});

const cartAction = (onPress: () => void): IconAction => ({
  accessibilityLabel: "장바구니",
  icon: { md: "shopping_cart", sf: "cart" },
  onPress,
});

const createUser = () =>
  userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

const product = {
  productId: "product-1",
  partnerId: "partner-1",
  brandId: "brand-1",
  brand: { brandId: "brand-1", name: "테스트 브랜드", slug: "test-brand" },
  categoryId: "category-1",
  title: "테스트 상품",
  description: "상품 설명",
  imageUrls: ["https://example.com/product.jpg"],
  status: "PUBLISHED",
  isOnSale: false,
  isExpressDelivery: false,
  skus: [
    {
      skuId: "sku-1",
      code: "sku-1",
      colorId: null,
      sizeId: null,
      optionName: "기본",
      price: 10_000,
      stock: 1,
    },
  ],
  createdAt: "2026-08-29T00:00:00.000Z",
};

const stylePost: StylePost = {
  stylePostId: "style-1",
  authorId: "user-1",
  author: { userId: "user-1", userid: "buyer" },
  title: "테스트 스타일",
  content: "오늘의 스타일",
  category: "CLOTHING",
  imageUrls: ["https://example.com/style.jpg"],
  thumbnailUrl: "https://example.com/style.jpg",
  hashtags: ["daily"],
  brandTags: [],
  products: [],
  isPartner: false,
  likeCount: 2,
  isLiked: true,
  createdAt: "2026-08-29T00:00:00.000Z",
  updatedAt: "2026-08-29T00:00:00.000Z",
};

describe("Android native actions", () => {
  it("renders the approved Home notification and cart actions", async () => {
    const user = createUser();

    await renderAsync(<HomeScreen />);

    const notificationButton = screen.getByRole("button", { name: "알림" });
    const cartButton = screen.getByRole("button", { name: "장바구니" });
    expect(screen.getByRole("img", { name: "알림" })).toHaveProp(
      "source",
      materialIconSource,
    );
    expect(screen.getByRole("img", { name: "장바구니" })).toHaveProp(
      "source",
      materialIconSource,
    );

    await user.press(notificationButton);
    await user.press(cartButton);

    expect(mockRunProtectedAction).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls.map(([path]) => path)).toEqual([
      "/notifications",
      "/cart",
    ]);
  });

  it("passes synchronous accessible icon props and invokes each action", async () => {
    const onNotificationPress = jest.fn();
    const onCartPress = jest.fn();
    const user = createUser();

    await renderAsync(
      <ActionButton
        actions={[
          notificationAction(onNotificationPress),
          cartAction(onCartPress),
        ]}
      />,
    );

    const buttons = await screen.findAllByRole("button");

    expect(buttons).toHaveLength(2);
    const [notificationButton, cartButton] = buttons;
    if (!notificationButton || !cartButton)
      throw new Error("Expected notification and cart buttons");

    const notificationImage = screen.getByRole("img", { name: "알림" });
    const cartImage = screen.getByRole("img", { name: "장바구니" });

    expect(notificationImage).toHaveProp("source", materialIconSource);
    expect(cartImage).toHaveProp("source", materialIconSource);
    expect(cartImage).toHaveStyle({ height: 20, width: 20 });

    await user.press(notificationButton);
    await user.press(cartButton);

    expect(onNotificationPress).toHaveBeenCalledTimes(1);
    expect(onCartPress).toHaveBeenCalledTimes(1);
  });

  it("renders header actions once using the requested circular pair", async () => {
    const onNotificationPress = jest.fn();
    const onCartPress = jest.fn();
    const user = createUser();

    await renderAsync(
      <ProductLayout
        headerActions={[
          notificationAction(onNotificationPress),
          cartAction(onCartPress),
        ]}
        variant="circularPair"
      >
        <View />
      </ProductLayout>,
    );

    const buttons = await screen.findAllByRole("button");

    expect(buttons).toHaveLength(2);

    const [notificationButton, cartButton] = buttons;
    if (!notificationButton || !cartButton)
      throw new Error("Expected notification and cart buttons");

    expect(notificationButton).toHaveStyle({ borderRadius: 20 });
    expect(cartButton).toHaveStyle({ borderRadius: 20 });
    expect(screen.getByRole("img", { name: "알림" })).toHaveProp(
      "source",
      materialIconSource,
    );
    expect(screen.getByRole("img", { name: "장바구니" })).toHaveProp(
      "source",
      materialIconSource,
    );

    await user.press(cartButton);

    expect(onNotificationPress).not.toHaveBeenCalled();
    expect(onCartPress).toHaveBeenCalledTimes(1);
  });

  it("keeps standalone text actions working", async () => {
    const onPress = jest.fn();
    const user = createUser();

    await renderAsync(<ActionButton actions={[{ label: "취소", onPress }]} />);

    const button = screen.getByRole("button", { name: "취소" });
    await user.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("provides a Material icon for every native tab", async () => {
    await renderAsync(<TabLayout />);

    expect(screen.getByRole("img", { name: "home" })).toBeOnTheScreen();
    expect(screen.getByRole("img", { name: "add_box" })).toBeOnTheScreen();
    expect(screen.getByRole("img", { name: "search" })).toBeOnTheScreen();
    expect(screen.getByRole("img", { name: "favorite" })).toBeOnTheScreen();
    expect(screen.getByRole("img", { name: "person" })).toBeOnTheScreen();
  });

  it("never sends SF Symbol sources to Android product and style images", async () => {
    await renderAsync(
      <View>
        <StylePostCard
          author="buyer"
          content="오늘의 스타일"
          hashtags={["daily"]}
          imageUrl="https://example.com/style.jpg"
          isLiked
          likeCount={2}
          onPress={jest.fn()}
          onToggleLike={jest.fn()}
          stylePostId="style-1"
        />
        <StylePostDetail
          isLikePending={false}
          onBack={jest.fn()}
          onProductPress={jest.fn()}
          onToggleLike={jest.fn()}
          post={stylePost}
        />
        <ShopFilterBar
          filters={defaultShopFilters}
          onOpenFilter={jest.fn()}
          onToggleExpress={jest.fn()}
          onToggleSale={jest.fn()}
        />
        <WishProductCard
          onPress={jest.fn()}
          onRemove={jest.fn()}
          product={product}
        />
      </View>,
    );

    const sources = screen
      .UNSAFE_getAllByType(
        "ExpoImage" as unknown as ComponentType<Record<string, unknown>>,
      )
      .map((image) => image.props.source);

    expect(sources).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^sf:/)]),
    );
  });
});
