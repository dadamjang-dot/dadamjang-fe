import { act, type ReactElement } from "react";
import { Image } from "expo-image";
import { Text } from "react-native";
import { create, type ReactTestRenderer } from "react-test-renderer";

import { ProductCard, type ProductCardProps } from "../product-card";

jest.mock("expo-image", () => ({
  Image: "ExpoImage",
}));

jest.mock("react-native-unistyles", () => ({
  StyleSheet: {
    create: <T,>(styles: T) => styles,
  },
}));

const render = (component: ReactElement) => {
  let renderer: ReactTestRenderer;

  act(() => {
    renderer = create(component);
  });

  return renderer!;
};

const findButton = (
  renderer: ReactTestRenderer,
  accessibilityLabel: string,
) => {
  const button = renderer.root
    .findAllByProps({ accessibilityLabel })
    .find((node) => node.props.accessibilityRole === "button");

  if (!button) throw new Error(`Button ${accessibilityLabel} was not rendered`);

  return button;
};

const product: ProductCardProps = {
  imageUrl: "https://example.com/t-shirt.jpg",
  isExpressDelivery: true,
  isOnSale: true,
  name: "오버핏 반팔 티셔츠",
  onPress: jest.fn(),
  onToggleLike: jest.fn(),
  originalPrice: 29900,
  price: 19900,
  productId: "product-1",
};

describe("ProductCard", () => {
  it("renders product benefits and prices", () => {
    const renderer = render(<ProductCard {...product} />);
    const text = renderer.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .filter((value): value is string => typeof value === "string");

    expect(text).toEqual(
      expect.arrayContaining([
        "슈퍼세일",
        "오버핏 반팔 티셔츠",
        "19,900원",
        "29,900원",
        "바로배송",
      ]),
    );
  });

  it("keys its product image to the stable product identity", () => {
    const renderer = render(<ProductCard {...product} />);
    const productImage = renderer.root
      .findAllByType(Image)
      .find((node) => node.props.source?.uri === product.imageUrl);

    expect(productImage?.props.recyclingKey).toBe("product-1");
  });

  it("keeps product and like actions independent", () => {
    const onPress = jest.fn();
    const onToggleLike = jest.fn();
    const renderer = render(
      <ProductCard
        {...product}
        isLiked
        onPress={onPress}
        onToggleLike={onToggleLike}
      />,
    );
    const productButton = findButton(renderer, "오버핏 반팔 티셔츠");
    const likeButton = findButton(renderer, "오버핏 반팔 티셔츠 좋아요 취소");

    expect(likeButton.props.accessibilityLabel).toBe(
      "오버핏 반팔 티셔츠 좋아요 취소",
    );
    expect(likeButton.props.accessibilityState).toEqual({ selected: true });

    act(() => {
      productButton.props.onPress();
      likeButton.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onToggleLike).toHaveBeenCalledWith(false);
  });
});
