import { render, screen, userEvent } from "@testing-library/react-native";

import ProductScreen from "@/app/product/[product-id]";
import { useCurrentUser } from "@/features/auth";
import { useCartActions } from "@/features/cart";
import { useProduct } from "@/features/catalog";
import {
  useBrandFollowActions,
  useFollowedBrands,
  useRecordRecentProductView,
} from "@/features/wish";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ "product-id": "product-1" }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/features/auth", () => ({ useCurrentUser: jest.fn() }));
jest.mock("@/features/cart", () => ({ useCartActions: jest.fn() }));
jest.mock("@/features/catalog", () => ({ useProduct: jest.fn() }));
jest.mock("@/features/wish", () => ({
  useBrandFollowActions: jest.fn(),
  useFollowedBrands: jest.fn(),
  useRecordRecentProductView: jest.fn(),
}));

const product = {
  productId: "product-1",
  partnerId: "partner-1",
  brandId: null,
  brand: null,
  categoryId: "category-1",
  title: "테스트 상품",
  description: "상품 설명",
  imageUrls: [],
  status: "PUBLISHED",
  isOnSale: false,
  isExpressDelivery: false,
  skus: [
    {
      skuId: "sku-1",
      code: "sku-1",
      colorId: null,
      sizeId: null,
      optionName: "블랙 / M",
      price: 8_000,
      stock: 2,
    },
    {
      skuId: "sku-2",
      code: "sku-2",
      colorId: null,
      sizeId: null,
      optionName: "화이트 / S",
      price: 8_000,
      stock: 1,
    },
  ],
  createdAt: "2026-08-12T00:00:00.000Z",
};

describe("product quantity controls", () => {
  beforeEach(() => {
    jest.mocked(useProduct).mockReturnValue({
      data: product,
      isError: false,
      isLoading: false,
    } as never);
    jest.mocked(useCartActions).mockReturnValue({
      upsert: { mutate: jest.fn() },
    } as never);
    jest.mocked(useCurrentUser).mockReturnValue({ data: undefined } as never);
    jest.mocked(useFollowedBrands).mockReturnValue({ data: [] } as never);
    jest.mocked(useBrandFollowActions).mockReturnValue({
      follow: { mutate: jest.fn() },
      unfollow: { mutate: jest.fn() },
    } as never);
    jest.mocked(useRecordRecentProductView).mockReturnValue({
      mutate: jest.fn(),
    } as never);
  });

  it("exposes disabled boundaries and never exceeds selected stock", async () => {
    const user = userEvent.setup();
    render(<ProductScreen />);

    expect(screen.getByRole("button", { name: "수량 줄이기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "수량 늘리기" })).toBeEnabled();

    await user.press(screen.getByRole("button", { name: "수량 늘리기" }));

    expect(screen.getByTestId("e2e.cart.quantity.value")).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: "수량 늘리기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "수량 줄이기" })).toBeEnabled();
  });

  it("resets quantity when selecting an option with lower stock", async () => {
    const user = userEvent.setup();
    render(<ProductScreen />);

    await user.press(screen.getByRole("button", { name: "수량 늘리기" }));
    await user.press(screen.getByRole("radio", { name: "화이트 / S" }));

    expect(screen.getByTestId("e2e.cart.quantity.value")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "수량 늘리기" })).toBeDisabled();
  });
});
