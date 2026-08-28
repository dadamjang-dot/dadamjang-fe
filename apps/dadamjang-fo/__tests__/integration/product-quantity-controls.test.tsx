import { render, screen, userEvent } from "@testing-library/react-native";

import ProductScreen from "@/app/product/[product-id]";
import { useAuthActionGate } from "@/features/auth";
import { useCartActions } from "@/features/cart";
import { useProduct } from "@/features/catalog";
import {
  useBrandFollowActions,
  useFollowedBrands,
  useRecordRecentProductView,
} from "@/features/wish";
import { layoutLegendList } from "../helpers/layout-legend-list";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ "product-id": "product-1" }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/features/auth", () => ({ useAuthActionGate: jest.fn() }));
jest.mock("@/features/cart", () => ({ useCartActions: jest.fn() }));
jest.mock("@/features/catalog", () => ({ useProduct: jest.fn() }));
jest.mock("@/features/wish", () => ({
  useBrandFollowActions: jest.fn(),
  useFollowedBrands: jest.fn(),
  useRecordRecentProductView: jest.fn(),
}));

const mockUpsert = jest.fn();

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

const renderProduct = () => {
  render(<ProductScreen />);
  layoutLegendList("상품 옵션 목록");
};

describe("product quantity controls", () => {
  beforeEach(() => {
    jest.mocked(useProduct).mockReturnValue({
      data: product,
      isError: false,
      isLoading: false,
    } as never);
    jest.mocked(useCartActions).mockReturnValue({
      upsert: { mutate: mockUpsert },
    } as never);
    jest.mocked(useAuthActionGate).mockReturnValue({
      authStatus: "authenticated",
      data: { userId: "user-1" },
      isAuthenticated: true,
      runProtectedAction: (action: () => void) => {
        action();
        return true;
      },
    } as never);
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
    renderProduct();

    expect(screen.getByRole("button", { name: "수량 줄이기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "수량 늘리기" })).toBeEnabled();

    await user.press(screen.getByRole("button", { name: "수량 늘리기" }));

    expect(screen.getByTestId("e2e.cart.quantity.value")).toHaveTextContent(
      "2",
    );
    expect(screen.getByRole("button", { name: "수량 늘리기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "수량 줄이기" })).toBeEnabled();
  });

  it("resets quantity when selecting an option with lower stock", async () => {
    const user = userEvent.setup();
    renderProduct();

    await user.press(screen.getByRole("button", { name: "수량 늘리기" }));
    await user.press(screen.getByRole("radio", { name: "화이트 / S" }));

    expect(screen.getByTestId("e2e.cart.quantity.value")).toHaveTextContent(
      "1",
    );
    expect(screen.getByRole("button", { name: "수량 늘리기" })).toBeDisabled();
  });

  it("clamps quantity when refreshed inventory decreases", async () => {
    const user = userEvent.setup();
    renderProduct();
    await user.press(screen.getByRole("button", { name: "수량 늘리기" }));
    expect(screen.getByTestId("e2e.cart.quantity.value")).toHaveTextContent(
      "2",
    );

    jest.mocked(useProduct).mockReturnValue({
      data: {
        ...product,
        skus: product.skus.map((sku) =>
          sku.skuId === "sku-1" ? { ...sku, stock: 1 } : sku,
        ),
      },
      isError: false,
      isLoading: false,
    } as never);
    screen.rerender(<ProductScreen />);

    expect(screen.getByTestId("e2e.cart.quantity.value")).toHaveTextContent(
      "1",
    );
    expect(screen.getByRole("button", { name: "수량 늘리기" })).toBeDisabled();
  });

  it("announces and disables an out-of-stock option", async () => {
    jest.mocked(useProduct).mockReturnValue({
      data: {
        ...product,
        skus: product.skus.map((sku) =>
          sku.skuId === "sku-1" ? { ...sku, stock: 0 } : sku,
        ),
      },
      isError: false,
      isLoading: false,
    } as never);
    const user = userEvent.setup();
    renderProduct();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "선택한 옵션은 품절이에요.",
    );
    const addButton = screen.getByRole("button", { name: "품절" });
    expect(addButton).toBeDisabled();
    await user.press(addButton);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
