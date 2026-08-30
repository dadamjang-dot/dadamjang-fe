import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import ProductScreen from "@/app/product/[product-id]";
import { useAuthActionGate } from "@/features/auth";
import { useCartActions } from "@/features/cart";
import { useProduct } from "@/features/catalog";
import { priceEvidenceQueryKeys } from "@/features/price-evidence";
import {
  useBrandFollowActions,
  useFollowedBrands,
  useRecordRecentProductView,
} from "@/features/wish";
import { Sentry } from "@/shared/observability/sentry";

const mockGetProductPriceEvidence = jest.fn();
const mockGetProductPriceSummary = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ "product-id": "product-1" }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/features/auth", () => ({ useAuthActionGate: jest.fn() }));
jest.mock("@/features/cart", () => ({ useCartActions: jest.fn() }));
jest.mock("@/features/catalog", () => ({ useProduct: jest.fn() }));
jest.mock("@/features/price-evidence/api", () => ({
  getComparisonPriceSummaries: jest.fn(),
  getProductPriceEvidence: (...args: unknown[]) =>
    mockGetProductPriceEvidence(...args),
  getProductPriceSummaries: jest.fn(),
  getProductPriceSummary: (...args: unknown[]) =>
    mockGetProductPriceSummary(...args),
}));
jest.mock("@/features/wish", () => ({
  useBrandFollowActions: jest.fn(),
  useFollowedBrands: jest.fn(),
  useRecordRecentProductView: jest.fn(),
}));

jest.mock("@legendapp/list/react-native", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
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
  brandId: null,
  brand: null,
  categoryId: "category-1",
  title: "테스트 상품",
  description: "상품 설명",
  imageUrls: [],
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
  name: "테스트 상품",
  thumbnail: null,
  basePrice: 19_000,
  finalPrice: 19_000,
  priceRevision: "revision-1",
  lowestPriceEvidenceSummary: "현재 옵션 최저가 기준",
  isOnSale: true,
  isExpressDelivery: false,
};

const evidence = {
  productId: "product-1",
  priceRevision: "revision-1",
  calculatedAt: "2026-08-30T03:00:00.000Z",
  offerSource: "다담장 입점 판매자",
  priceHistory: [
    {
      label: "옵션 최고가",
      price: 25_000,
      recordedAt: "2026-08-30T03:00:00.000Z",
    },
    {
      label: "옵션 최저가",
      price: 19_000,
      recordedAt: "2026-08-30T03:00:00.000Z",
    },
  ],
  couponConditions: [],
  shippingPolicy: null,
};

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
    },
  });

const createWrapper = (client: QueryClient) => {
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = "ProductPriceEvidenceTestWrapper";
  return TestWrapper;
};

const renderProduct = (client = createClient()) =>
  render(<ProductScreen />, { wrapper: createWrapper(client) });

describe("product price evidence", () => {
  beforeEach(() => {
    jest.mocked(useProduct).mockReturnValue({
      data: product,
      isError: false,
      isLoading: false,
    } as never);
    jest.mocked(useCartActions).mockReturnValue({
      upsert: { mutate: jest.fn() },
    } as never);
    jest.mocked(useAuthActionGate).mockReturnValue({
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
    mockGetProductPriceSummary.mockResolvedValue(summary);
    mockGetProductPriceEvidence.mockResolvedValue(evidence);
  });

  it("records one expansion breadcrumb across a route remount", async () => {
    const user = userEvent.setup();
    const firstRoute = renderProduct();

    await user.press(
      await screen.findByRole("button", { name: "최저가 산정 근거 펼치기" }),
    );
    firstRoute.unmount();
    renderProduct();
    await user.press(
      await screen.findByRole("button", { name: "최저가 산정 근거 펼치기" }),
    );

    expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(1);
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: "PRICE_EVIDENCE_EXPANDED" }),
    );
  });

  it("keeps a cached revision lazy until an accessible explicit expansion", async () => {
    const user = userEvent.setup();
    const client = createClient();
    client.setQueryData(
      priceEvidenceQueryKeys.productPriceSummaryById("product-1"),
      summary,
    );
    renderProduct(client);

    const trigger = await screen.findByRole("button", {
      name: "최저가 산정 근거 펼치기",
    });
    expect(trigger).toHaveProp(
      "accessibilityState",
      expect.objectContaining({ expanded: false }),
    );
    expect(mockGetProductPriceSummary).not.toHaveBeenCalled();
    expect(mockGetProductPriceEvidence).not.toHaveBeenCalled();

    await user.press(trigger);

    expect(
      await screen.findByRole("button", { name: "최저가 산정 근거 접기" }),
    ).toHaveProp(
      "accessibilityState",
      expect.objectContaining({ expanded: true }),
    );
    expect(
      (await screen.findAllByText("현재 최저가 19,000원")).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("출처 다담장 입점 판매자")).toBeVisible();
    expect(screen.getByText("옵션 가격 구성")).toBeVisible();
    expect(screen.getByText("옵션 최고가 25,000원")).toBeVisible();
    expect(screen.getByText("적용 가능한 쿠폰이 없어요.")).toBeVisible();
    expect(screen.getByText("배송 정보가 없어요.")).toBeVisible();
    expect(screen.getAllByText(/2026/).length).toBeGreaterThan(0);
    expect(mockGetProductPriceEvidence).toHaveBeenCalledTimes(1);
  });

  it("refreshes the summary and retries with a changed price revision", async () => {
    const user = userEvent.setup();
    mockGetProductPriceSummary
      .mockResolvedValueOnce(summary)
      .mockResolvedValueOnce({ ...summary, priceRevision: "revision-2" });
    mockGetProductPriceEvidence
      .mockRejectedValueOnce(new Error("price revision conflict"))
      .mockResolvedValueOnce({ ...evidence, priceRevision: "revision-2" });
    renderProduct();

    await user.press(
      await screen.findByRole("button", { name: "최저가 산정 근거 펼치기" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "가격 근거를 불러오지 못했어요.",
    );

    await user.press(
      screen.getByRole("button", { name: "가격 근거 다시 시도" }),
    );

    await waitFor(() =>
      expect(mockGetProductPriceEvidence).toHaveBeenLastCalledWith(
        "product-1",
        "revision-2",
        expect.anything(),
      ),
    );
    expect(
      (await screen.findAllByText("현재 최저가 19,000원")).length,
    ).toBeGreaterThan(0);
  });

  it("refetches evidence when retry keeps the same price revision", async () => {
    const user = userEvent.setup();
    mockGetProductPriceEvidence
      .mockRejectedValueOnce(new Error("temporary detail failure"))
      .mockResolvedValueOnce(evidence);
    renderProduct();

    await user.press(
      await screen.findByRole("button", { name: "최저가 산정 근거 펼치기" }),
    );
    expect(await screen.findByRole("alert")).toBeVisible();
    await user.press(
      screen.getByRole("button", { name: "가격 근거 다시 시도" }),
    );

    await waitFor(() =>
      expect(mockGetProductPriceEvidence).toHaveBeenCalledTimes(2),
    );
    expect(mockGetProductPriceEvidence).toHaveBeenLastCalledWith(
      "product-1",
      "revision-1",
      expect.anything(),
    );
  });

  it("shows readable empty states", async () => {
    const user = userEvent.setup();
    mockGetProductPriceEvidence.mockResolvedValue({
      ...evidence,
      couponConditions: [],
      priceHistory: [],
    });
    renderProduct();

    await user.press(
      await screen.findByRole("button", { name: "최저가 산정 근거 펼치기" }),
    );

    expect(await screen.findByText("옵션 가격 정보가 없어요.")).toBeVisible();
    expect(screen.getByText("적용 가능한 쿠폰이 없어요.")).toBeVisible();
    expect(screen.getByText("배송 정보가 없어요.")).toBeVisible();
  });
});
