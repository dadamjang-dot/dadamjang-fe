import { render, screen, userEvent } from "@testing-library/react-native";

import { ProductCard, type ProductCardProps } from "../product-card";

jest.mock("expo-image", () => ({ Image: "ExpoImage" }));

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
    render(<ProductCard {...product} />);

    expect(
      screen.UNSAFE_getByProps({ recyclingKey: "product-1" }),
    ).toHaveProp("source", { uri: "https://example.com/t-shirt.jpg" });
    expect(screen.getByText("슈퍼세일")).toBeVisible();
    expect(screen.getByText("오버핏 반팔 티셔츠")).toBeVisible();
    expect(screen.getByText("19,900원")).toBeVisible();
    expect(screen.getByText("29,900원")).toBeVisible();
    expect(screen.getByText("바로배송")).toBeVisible();
  });

  it("keeps product and like actions independent", async () => {
    const onPress = jest.fn();
    const onToggleLike = jest.fn();
    const user = userEvent.setup();
    render(
      <ProductCard
        {...product}
        isLiked
        onPress={onPress}
        onToggleLike={onToggleLike}
      />,
    );
    const productButton = screen.getByRole("button", {
      name: "오버핏 반팔 티셔츠",
    });
    const likeButton = screen.getByRole("button", {
      name: "오버핏 반팔 티셔츠 좋아요 취소",
    });

    expect(likeButton).toBeSelected();
    await user.press(productButton);
    await user.press(likeButton);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onToggleLike).toHaveBeenCalledWith(false);
  });

  it("renders the new identity when a recycled card receives another product", () => {
    render(<ProductCard {...product} />);

    screen.rerender(
      <ProductCard
        {...product}
        imageUrl="https://example.com/hoodie.jpg"
        name="후드 집업"
        productId="product-2"
      />,
    );

    expect(screen.queryByText("오버핏 반팔 티셔츠")).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "후드 집업" })).toBeVisible();
  });
});
