import { render, screen } from "@testing-library/react-native";

import StylePostDetail from "@/features/style/components/style-post-detail";
import type { StylePost } from "@/features/style/types";
import WishProductCard from "@/features/wish/components/wish-product-card";
import type { Product } from "@/features/catalog";

jest.mock("expo-image", () => ({ Image: "ExpoImage" }));

jest.mock("@/shared/components", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text, View } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  const { Button } = jest.requireActual("@/shared/components/button");

  return {
    Button,
    TitleHeader: ({
      children,
      title,
    }: {
      children?: React.ReactNode;
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

const post: StylePost = {
  stylePostId: "style-1",
  authorId: "user-1",
  author: { userId: "user-1", userid: "buyer" },
  title: "테스트 스타일",
  content: "오늘의 스타일",
  category: "CLOTHING",
  imageUrls: [
    "https://example.com/style-1.jpg",
    "https://example.com/style-2.jpg",
  ],
  thumbnailUrl: null,
  hashtags: [],
  brandTags: [],
  products: [
    {
      productId: "product-1",
      title: "테스트 상품",
      imageUrls: ["https://example.com/product-1.jpg"],
      brandId: "brand-1",
      brandName: "테스트 브랜드",
      categoryId: "category-1",
    },
  ],
  isPartner: false,
  likeCount: 0,
  isLiked: false,
  createdAt: "2026-08-29T00:00:00.000Z",
  updatedAt: "2026-08-29T00:00:00.000Z",
};

const product: Product = {
  productId: "product-2",
  partnerId: "partner-1",
  brandId: null,
  brand: null,
  categoryId: "category-1",
  title: "위시 상품",
  description: "상품 설명",
  imageUrls: ["https://example.com/product-2.jpg"],
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

describe("recycled product images", () => {
  it("keys every style gallery image by post, index, and URL", () => {
    render(
      <StylePostDetail
        isLikePending={false}
        onBack={jest.fn()}
        onProductPress={jest.fn()}
        onToggleLike={jest.fn()}
        post={post}
      />,
    );

    expect(
      screen.UNSAFE_getByProps({ source: "https://example.com/style-1.jpg" }),
    ).toHaveProp(
      "recyclingKey",
      "style-1:0:https://example.com/style-1.jpg",
    );
    expect(
      screen.UNSAFE_getByProps({ source: "https://example.com/style-2.jpg" }),
    ).toHaveProp(
      "recyclingKey",
      "style-1:1:https://example.com/style-2.jpg",
    );
  });

  it("keys product images by product ID in virtualized style detail rows", () => {
    render(
      <StylePostDetail
        isLikePending={false}
        onBack={jest.fn()}
        onProductPress={jest.fn()}
        onToggleLike={jest.fn()}
        post={post}
      />,
    );

    expect(
      screen.UNSAFE_getByProps({ source: "https://example.com/product-1.jpg" }),
    ).toHaveProp("recyclingKey", "product-1");
  });

  it("keys product images by product ID in virtualized wish rows", () => {
    render(
      <WishProductCard
        onPress={jest.fn()}
        onRemove={jest.fn()}
        product={product}
      />,
    );

    expect(
      screen.UNSAFE_getByProps({ recyclingKey: "product-2" }),
    ).toHaveProp("source", { uri: "https://example.com/product-2.jpg" });
  });
});
