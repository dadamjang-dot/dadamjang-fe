import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { ScrollView } from "react-native";

import { ProductDetail } from "@/features/product-detail";
import { useAuthActionGate } from "@/features/auth";
import { useCartActions } from "@/features/cart";
import { useCatalogFilterOptions, useProduct } from "@/features/catalog";
import { useProductPriceSummary } from "@/features/price-evidence";
import {
  useBrandFollowActions,
  useFollowedBrands,
  useRecordRecentProductView,
  useWishActions,
  useWishlist,
} from "@/features/wish";

jest.mock("expo-image", () => ({ Image: "ExpoImage" }));
jest.mock("@legendapp/list/react-native", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    LegendList: ({
      data,
      extraData,
      ListFooterComponent,
      ListHeaderComponent,
      renderItem,
    }: {
      data: unknown[];
      extraData?: unknown;
      ListFooterComponent?: React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      renderItem: ({ item }: { item: unknown }) => React.ReactNode;
    }) =>
      React.createElement(
        View,
        { testID: "e2e.product.options-list" },
        React.createElement(
          Text,
          { testID: "e2e.product.options-list.extra-data" },
          typeof extraData === "string" ? extraData : "",
        ),
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
jest.mock("@/features/auth", () => ({ useAuthActionGate: jest.fn() }));
jest.mock("@/features/cart", () => ({ useCartActions: jest.fn() }));
jest.mock("@/features/catalog", () => ({
  useCatalogFilterOptions: jest.fn(),
  useProduct: jest.fn(),
}));
jest.mock("@/features/price-evidence", () => {
  return {
    useProductPriceSummary: jest.fn(),
  };
});
jest.mock("@/features/wish", () => ({
  useBrandFollowActions: jest.fn(),
  useFollowedBrands: jest.fn(),
  useRecordRecentProductView: jest.fn(),
  useWishActions: jest.fn(),
  useWishlist: jest.fn(),
}));

const product = {
  productId: "product-1",
  partnerId: "partner-1",
  brandId: "brand-1",
  brand: { brandId: "brand-1", name: "다담 브랜드", slug: "dadam" },
  categoryId: "category-1",
  title: "테스트 재킷",
  description: "편안한 데일리 재킷",
  imageUrls: [
    "https://example.com/product-1.jpg",
    "https://example.com/product-2.jpg",
  ],
  status: "PUBLISHED",
  isOnSale: true,
  isExpressDelivery: true,
  skus: [
    {
      skuId: "sku-black",
      code: "BLACK-M",
      colorId: "black",
      sizeId: "m",
      optionName: "블랙 / M",
      price: 19_000,
      stock: 2,
    },
    {
      skuId: "sku-white",
      code: "WHITE-S",
      colorId: "white",
      sizeId: "s",
      optionName: "화이트 / S",
      price: 21_000,
      stock: 0,
    },
    {
      skuId: "sku-black-s",
      code: "BLACK-S",
      colorId: "black",
      sizeId: "s",
      optionName: "블랙 / S",
      price: 20_000,
      stock: 3,
    },
    {
      skuId: "sku-white-m",
      code: "WHITE-M",
      colorId: "white",
      sizeId: "m",
      optionName: "화이트 / M",
      price: 22_000,
      stock: 1,
    },
    {
      skuId: "sku-gray-s",
      code: "GRAY-S",
      colorId: "gray",
      sizeId: "s",
      optionName: "그레이 / S",
      price: 20_000,
      stock: 0,
    },
  ],
  createdAt: "2026-08-31T00:00:00.000Z",
};

const mockUpsert = jest.fn();
const mockOpenCart = jest.fn();

const renderDetail = () =>
  render(<ProductDetail onOpenCart={mockOpenCart} productId="product-1" />);

describe("product detail", () => {
  beforeEach(() => {
    jest.mocked(useCatalogFilterOptions).mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as never);
    jest.mocked(useProduct).mockReturnValue({
      data: product,
      isError: false,
      isLoading: false,
    } as never);
    jest.mocked(useProductPriceSummary).mockReturnValue({
      data: {
        productId: "product-1",
        name: "테스트 재킷",
        thumbnail: null,
        basePrice: 24_000,
        finalPrice: 18_000,
        priceRevision: "revision-1",
        lowestPriceEvidenceSummary: "현재 옵션 최저가 기준",
        isOnSale: true,
        isExpressDelivery: true,
      },
      isError: false,
    } as never);
    jest.mocked(useCartActions).mockReturnValue({
      upsert: { isError: false, isPending: false, mutate: mockUpsert },
    } as never);
    jest.mocked(useAuthActionGate).mockReturnValue({
      data: { userId: "user-1" },
      isAuthenticated: true,
      runProtectedAction: (action: () => void) => {
        action();
        return true;
      },
    } as never);
    jest.mocked(useWishlist).mockReturnValue({ data: [] } as never);
    jest.mocked(useWishActions).mockReturnValue({
      add: { mutate: jest.fn() },
      remove: { mutate: jest.fn() },
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

  it("leaves back and cart navigation to the native stack header", () => {
    renderDetail();

    expect(screen.queryByRole("button", { name: "뒤로 가기" })).toBeNull();
    expect(screen.queryByTestId("e2e.product.cart")).toBeNull();
  });

  it("shows every product image with a page counter and stable recycling keys", () => {
    renderDetail();

    expect(screen.getByText("1 / 2")).toBeVisible();
    expect(
      screen.UNSAFE_getByProps({ source: "https://example.com/product-1.jpg" }),
    ).toHaveProp(
      "recyclingKey",
      "product-1:0:https://example.com/product-1.jpg",
    );
    expect(
      screen.UNSAFE_getByProps({ source: "https://example.com/product-2.jpg" }),
    ).toHaveProp(
      "recyclingKey",
      "product-1:1:https://example.com/product-2.jpg",
    );
  });

  it("updates the gallery page counter after paging to another image", () => {
    renderDetail();

    fireEvent(screen.UNSAFE_getByType(ScrollView), "momentumScrollEnd", {
      nativeEvent: { contentOffset: { x: 390 } },
    });

    expect(screen.getByText("2 / 2")).toBeVisible();
  });

  it("shows an accessible image placeholder when the product has no images", () => {
    jest.mocked(useProduct).mockReturnValue({
      data: { ...product, imageUrls: [] },
      isError: false,
      isLoading: false,
    } as never);

    renderDetail();

    const placeholder = screen.getByLabelText("테스트 재킷 이미지 없음");
    expect(placeholder).toBeVisible();
    expect(placeholder).toHaveProp("accessible", true);
    expect(placeholder).toHaveProp("accessibilityRole", "image");
  });

  it("shows a readable loading state", () => {
    jest.mocked(useProduct).mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
    } as never);

    render(<ProductDetail onOpenCart={mockOpenCart} productId="product-1" />);

    expect(screen.getByText("상품을 불러오는 중이에요.")).toBeVisible();
  });

  it("keeps the retry action available after a product error", async () => {
    const refetch = jest.fn();
    const user = userEvent.setup();
    jest.mocked(useProduct).mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      refetch,
    } as never);

    render(<ProductDetail onOpenCart={mockOpenCart} productId="product-1" />);

    await user.press(screen.getByTestId("e2e.product.retry"));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps product metadata and the summary price visible before an option is selected", () => {
    renderDetail();

    expect(screen.getByText("다담 브랜드")).toBeVisible();
    expect(screen.getByText("테스트 재킷")).toBeVisible();
    expect(screen.getByText("편안한 데일리 재킷")).toBeVisible();
    expect(screen.getByText("빠른 배송")).toBeVisible();
    expect(screen.getByTestId("e2e.product.price")).toHaveTextContent(
      "18,000원",
    );
    expect(
      screen.getByRole("button", { name: "옵션을 선택해 주세요" }),
    ).toBeDisabled();
  });

  it("keeps the price and purchase flow without showing the evidence summary", () => {
    renderDetail();

    expect(screen.queryByText("현재 옵션 최저가 기준")).toBeNull();
    expect(screen.getByTestId("e2e.product.price")).toHaveTextContent(
      "18,000원",
    );
    expect(
      screen.getByRole("button", { name: "옵션을 선택해 주세요" }),
    ).toBeDisabled();
  });

  it("falls back to the lowest SKU price when the price summary is unavailable", () => {
    jest.mocked(useProductPriceSummary).mockReturnValue({
      data: undefined,
      isError: true,
    } as never);

    renderDetail();

    expect(screen.getByTestId("e2e.product.price")).toHaveTextContent(
      "19,000원",
    );
  });

  it("shows a safe no-price state for a sold-out product with no SKUs", () => {
    jest.mocked(useProduct).mockReturnValue({
      data: { ...product, skus: [] },
      isError: false,
      isLoading: false,
    } as never);
    jest.mocked(useProductPriceSummary).mockReturnValue({
      data: undefined,
      isError: true,
    } as never);

    renderDetail();

    expect(screen.getByTestId("e2e.product.price")).toHaveTextContent(
      "가격 정보 없음",
    );
    expect(screen.getByRole("button", { name: "품절" })).toBeDisabled();
  });

  it("resolves catalog color and size selections to a purchasable SKU", async () => {
    const user = userEvent.setup();
    jest.mocked(useCatalogFilterOptions).mockReturnValue({
      data: {
        categories: [],
        brands: [],
        colors: [
          { colorId: "black", name: "블랙", slug: "black", hexCode: "#000000" },
          { colorId: "white", name: "화이트", slug: "white", hexCode: "#FFFFFF" },
          { colorId: "gray", name: "그레이", slug: "gray", hexCode: "#808080" },
        ],
        sizes: [
          { sizeId: "s", name: "S", slug: "s", sortOrder: 1 },
          { sizeId: "m", name: "M", slug: "m", sortOrder: 2 },
        ],
      },
      isError: false,
      isLoading: false,
    } as never);
    renderDetail();

    expect(screen.getByLabelText("컬러")).toBeVisible();
    expect(screen.getByLabelText("사이즈")).toBeVisible();
    expect(screen.getByRole("radio", { name: "그레이" })).toBeDisabled();

    await user.press(screen.getByRole("radio", { name: "블랙" }));
    expect(screen.getByRole("radio", { name: "S" })).toBeEnabled();
    await user.press(screen.getByRole("radio", { name: "M" }));
    await user.press(screen.getByRole("button", { name: "수량 늘리기" }));
    expect(screen.getByTestId("e2e.cart.quantity.value")).toHaveTextContent(
      "2",
    );

    await user.press(screen.getByRole("radio", { name: "S" }));
    expect(screen.getByTestId("e2e.product.price")).toHaveTextContent(
      "20,000원",
    );
    expect(screen.getByTestId("e2e.cart.quantity.value")).toHaveTextContent(
      "1",
    );
    await user.press(screen.getByTestId("e2e.product.buy"));

    expect(mockUpsert).toHaveBeenCalledWith(
      { quantity: 1, skuId: "sku-black-s" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    await user.press(screen.getByRole("radio", { name: "화이트" }));
    expect(screen.getByRole("radio", { name: "S" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "S" })).toHaveProp(
      "accessibilityState",
      expect.objectContaining({ selected: false }),
    );
  });

  it("uses the selected SKU price and never lets quantity exceed its stock", async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.press(screen.getByRole("radio", { name: "블랙 / M" }));
    expect(screen.getByTestId("e2e.product.price")).toHaveTextContent(
      "19,000원",
    );
    await user.press(screen.getByRole("button", { name: "수량 늘리기" }));
    expect(screen.getByTestId("e2e.cart.quantity.value")).toHaveTextContent(
      "2",
    );
    expect(screen.getByRole("button", { name: "수량 늘리기" })).toBeDisabled();
  });

  it("passes the selected SKU to the virtualized option list rerender contract", async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.press(screen.getByRole("radio", { name: "블랙 / M" }));

    expect(
      screen.getByTestId("e2e.product.options-list.extra-data"),
    ).toHaveTextContent("sku-black");
  });

  it("keeps a selected option visible but blocks purchase after its stock is refreshed to zero", async () => {
    const user = userEvent.setup();
    const detail = renderDetail();
    await user.press(screen.getByRole("radio", { name: "블랙 / M" }));

    jest.mocked(useProduct).mockReturnValue({
      data: {
        ...product,
        skus: product.skus.map((sku) =>
          sku.skuId === "sku-black" ? { ...sku, stock: 0 } : sku,
        ),
      },
      isError: false,
      isLoading: false,
    } as never);
    detail.rerender(
      <ProductDetail onOpenCart={mockOpenCart} productId="product-1" />,
    );

    expect(screen.getByRole("radio", { name: "블랙 / M" })).toHaveProp(
      "accessibilityState",
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByRole("button", { name: "품절" })).toBeDisabled();
    expect(screen.getByTestId("e2e.cart.quantity.value")).toHaveTextContent(
      "0",
    );
    expect(screen.getByRole("button", { name: "수량 줄이기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "수량 늘리기" })).toBeDisabled();
  });

  it("labels the purchase action sold out when no SKU can be purchased", () => {
    jest.mocked(useProduct).mockReturnValue({
      data: {
        ...product,
        skus: product.skus.map((sku) => ({ ...sku, stock: 0 })),
      },
      isError: false,
      isLoading: false,
    } as never);

    renderDetail();

    expect(screen.getByRole("button", { name: "품절" })).toBeDisabled();
  });

  it("keeps a failed purchase on the detail screen with readable feedback", async () => {
    jest.mocked(useCartActions).mockReturnValue({
      upsert: { isError: true, isPending: false, mutate: mockUpsert },
    } as never);
    const user = userEvent.setup();
    renderDetail();
    await user.press(screen.getByRole("radio", { name: "블랙 / M" }));

    expect(
      screen.getByText("장바구니에 담지 못했어요. 다시 시도해 주세요."),
    ).toBeVisible();
    await user.press(screen.getByTestId("e2e.product.buy"));

    expect(mockOpenCart).not.toHaveBeenCalled();
  });

  it("gates wish, follow, and purchase for unauthenticated shoppers", async () => {
    const runProtectedAction = jest.fn(() => false);
    jest.mocked(useAuthActionGate).mockReturnValue({
      data: undefined,
      isAuthenticated: false,
      runProtectedAction,
    } as never);
    const user = userEvent.setup();
    renderDetail();

    await user.press(screen.getByTestId("e2e.product.wish"));
    await user.press(screen.getByTestId("e2e.product.brand.follow.brand-1"));
    await user.press(screen.getByRole("radio", { name: "블랙 / M" }));
    await user.press(screen.getByTestId("e2e.product.buy"));

    expect(runProtectedAction).toHaveBeenCalledTimes(3);
  });

  it("opens the cart after a successful purchase of the selected SKU quantity", async () => {
    const user = userEvent.setup();
    mockUpsert.mockImplementation(
      (_input: unknown, options: { onSuccess: () => void }) =>
        options.onSuccess(),
    );
    renderDetail();
    await user.press(screen.getByRole("radio", { name: "블랙 / M" }));
    await user.press(screen.getByRole("button", { name: "수량 늘리기" }));
    await user.press(screen.getByTestId("e2e.product.buy"));

    expect(mockUpsert).toHaveBeenCalledWith(
      { quantity: 2, skuId: "sku-black" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(mockOpenCart).toHaveBeenCalledTimes(1);
  });
});
