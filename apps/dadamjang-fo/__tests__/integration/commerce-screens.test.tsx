import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import { AuthSessionStateProvider } from "@/features/auth/auth-session-state";
import { getCurrentUser } from "@/features/auth/api";
import { authQueryKeys } from "@/features/auth/hooks";
import { checkoutCart, getCart, removeCartItem } from "@/features/cart/api";
import { getOrder, getOrders } from "@/features/order/api";
import CartScreen from "@/app/cart";
import WishScreen from "@/app/(tabs)/wish";
import OrderDetailScreen from "@/app/order/[order-id]";
import OrdersScreen from "@/app/orders";
import { getWishlist } from "@/features/wish/api";
import type { Action } from "@dadamjang/mobile";
import { layoutLegendList } from "../helpers/layout-legend-list";

const mockNavigation: { path?: string } = {};
const mockSearchParams: { "order-id"?: string; forcePaymentFailure?: string } = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: (path: string) => {
      mockNavigation.path = path;
    },
    replace: (path: string) => {
      mockNavigation.path = path;
    },
  }),
}));

jest.mock("@/shared/components", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const { Button } = jest.requireActual("@/shared/components/button");

  return {
    ActionButton: ({ actions }: { actions: Action[] }) => {
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
    Button,
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

jest.mock("@/features/auth/api", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/features/cart/api", () => ({
  checkoutCart: jest.fn(),
  getCart: jest.fn(),
  removeCartItem: jest.fn(),
  upsertCartItem: jest.fn(),
}));

jest.mock("@/features/order/api", () => ({
  getOrder: jest.fn(),
  getOrders: jest.fn(),
}));

jest.mock("@/features/wish/api", () => ({
  addWish: jest.fn(),
  getWishlist: jest.fn(),
  removeWish: jest.fn(),
}));

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
  client.setQueryData(authQueryKeys.viewer, {
    userId: "user-1",
    userid: "buyer",
    email: "buyer@example.com",
    role: "USER",
  });
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthSessionStateProvider
        value={{ error: null, hasSession: true, retry: async () => undefined }}
      >
        {children}
      </AuthSessionStateProvider>
    </QueryClientProvider>
  );
  TestWrapper.displayName = "CommerceScreenTestWrapper";
  return TestWrapper;
};

const cart = {
  cartId: "cart-1",
  totalAmount: 8_000,
  items: [
    {
      cartItemId: "cart-item-1",
      quantity: 1,
      sku: { skuId: "sku-1", optionName: "블랙 / M", price: 8_000 },
      product: { productId: "product-1", title: "테스트 상품", imageUrls: [] },
    },
  ],
};

const secondCartItem = {
  cartItemId: "cart-item-2",
  quantity: 2,
  sku: { skuId: "sku-2", optionName: "아이보리 / L", price: 12_000 },
  product: {
    productId: "product-2",
    title: "두 번째 상품",
    imageUrls: [],
  },
};

const wishlist = [
  {
    wishId: "wish-1",
    productId: "product-1",
    createdAt: "2026-08-12T00:00:00.000Z",
    product: {
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
          code: "sku-1",
          colorId: null,
          sizeId: null,
          optionName: "블랙 / M",
          price: 8_000,
          stock: 10,
        },
      ],
      createdAt: "2026-08-12T00:00:00.000Z",
    },
  },
];

describe("cart and wish screens", () => {
  beforeEach(() => {
    mockNavigation.path = undefined;
    delete mockSearchParams["order-id"];
    delete mockSearchParams.forcePaymentFailure;
    jest.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      userid: "buyer",
      email: "buyer@example.com",
      role: "USER",
    });
    jest.mocked(getCart).mockResolvedValue(cart);
    jest.mocked(getWishlist).mockResolvedValue(wishlist);
  });

  afterEach(() => {
    delete mockNavigation.path;
  });

  it("opens a payment-pending order route after checkout", async () => {
    jest.mocked(checkoutCart).mockResolvedValue({
      orderId: "order-1",
      orderNumber: "20260812-1",
      status: "PAYMENT_PENDING",
      paymentStatus: "PENDING",
      totalAmount: 8_000,
    });
    render(<CartScreen />, { wrapper: createWrapper() });

    await fireEvent.press(await screen.findByTestId("e2e.checkout.submit"));

    await waitFor(() => expect(mockNavigation.path).toBe("/order/order-1"));
  });

  it("exposes cart quantity, removal, and checkout button states", async () => {
    jest.mocked(checkoutCart).mockImplementation(() => new Promise(() => undefined));
    render(<CartScreen />, { wrapper: createWrapper() });

    await screen.findByLabelText("장바구니 상품 목록");
    layoutLegendList("장바구니 상품 목록");
    expect(
      screen.getByRole("button", { name: "테스트 상품 수량 줄이기" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "테스트 상품 수량 늘리기" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "테스트 상품 삭제" }),
    ).toBeEnabled();

    const checkout = screen.getByRole("button", { name: "결제하기" });
    expect(checkout).toHaveProp("accessibilityState", { disabled: false });
    await fireEvent.press(checkout);
    await waitFor(() => expect(checkout).toBeDisabled());
    expect(checkout).toHaveProp("accessibilityState", { disabled: true });
  });

  it("exposes cart and order retry controls as named buttons", async () => {
    jest.mocked(getCart).mockRejectedValueOnce(new Error("cart unavailable"));
    const cartScreen = render(<CartScreen />, { wrapper: createWrapper() });

    expect(
      await screen.findByRole("button", { name: "다시 시도" }),
    ).toHaveProp("testID", "e2e.cart.retry");
    cartScreen.unmount();

    jest.mocked(getOrders).mockRejectedValueOnce(new Error("orders unavailable"));
    render(<OrdersScreen />, { wrapper: createWrapper() });

    expect(
      await screen.findByRole("button", { name: "다시 시도" }),
    ).toHaveProp("testID", "e2e.order.retry");
  });

  it("names order-row buttons by order number", async () => {
    jest.mocked(getOrders).mockResolvedValueOnce([
      {
        orderId: "order-1",
        orderNumber: "20260829-1",
        status: "PAID",
        paymentStatus: "APPROVED",
        totalAmount: 8_000,
        items: [],
        createdAt: "2026-08-29T00:00:00.000Z",
      },
    ]);
    render(<OrdersScreen />, { wrapper: createWrapper() });

    await screen.findByLabelText("주문 내역");
    layoutLegendList("주문 내역");

    expect(
      screen.getByRole("button", { name: "20260829-1" }),
    ).toBeEnabled();
  });

  it.each(
    [
      {
        status: "PAYMENT_PENDING",
        paymentStatus: "PENDING",
        headline: "결제 승인을 기다리고 있어요.",
        testID: "e2e.checkout.pending",
        orderLabel: "결제 대기",
        paymentLabel: "승인 대기",
      },
      {
        status: "PAID",
        paymentStatus: "APPROVED",
        headline: "결제가 완료됐어요.",
        testID: "e2e.checkout.success",
        orderLabel: "결제 완료",
        paymentLabel: "승인 완료",
      },
      {
        status: "FULFILLING",
        paymentStatus: "APPROVED",
        headline: "결제가 완료됐어요.",
        testID: "e2e.checkout.success",
        orderLabel: "처리 중",
        paymentLabel: "승인 완료",
      },
      {
        status: "COMPLETED",
        paymentStatus: "APPROVED",
        headline: "결제가 완료됐어요.",
        testID: "e2e.checkout.success",
        orderLabel: "처리 완료",
        paymentLabel: "승인 완료",
      },
      {
        status: "CANCELLED",
        paymentStatus: "APPROVED",
        headline: "주문이 취소됐어요. 결제 취소/환불 상태를 확인해 주세요.",
        testID: "e2e.order.cancelled",
        orderLabel: "주문 취소",
        paymentLabel: "승인 완료",
      },
      {
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        headline: "결제가 취소됐어요.",
        testID: "e2e.checkout.cancelled",
        orderLabel: "주문 취소",
        paymentLabel: "결제 취소",
      },
      {
        status: "FAILED",
        paymentStatus: "FAILED",
        headline: "결제에 실패했어요.",
        testID: "e2e.checkout.failure",
        orderLabel: "결제 실패",
        paymentLabel: "승인 실패",
      },
    ] as const,
  )(
    "renders $status + $paymentStatus as $testID",
    async ({ status, paymentStatus, headline, testID, orderLabel, paymentLabel }) => {
      mockSearchParams["order-id"] = "order-1";
      jest.mocked(getOrder).mockResolvedValue({
        orderId: "order-1",
        orderNumber: "20260812-1",
        status,
        paymentStatus,
        paymentFailureReason: null,
        totalAmount: 8_000,
        items: [],
        createdAt: "2026-08-12T00:00:00.000Z",
      });

      render(<OrderDetailScreen />, { wrapper: createWrapper() });

      expect(await screen.findByTestId(testID)).toBeVisible();
      expect(screen.getByText(headline)).toBeVisible();
      expect(screen.getByText(orderLabel)).toBeVisible();
      expect(screen.getByText(paymentLabel)).toBeVisible();
    },
  );

  it("does not forward checkout test controls from deep links", async () => {
    mockSearchParams.forcePaymentFailure = "true";
    jest.mocked(checkoutCart).mockResolvedValue({
      orderId: "order-1",
      orderNumber: "20260812-1",
      status: "PAYMENT_PENDING",
      paymentStatus: "PENDING",
      totalAmount: 8_000,
    });
    render(<CartScreen />, { wrapper: createWrapper() });

    await fireEvent.press(await screen.findByTestId("e2e.checkout.submit"));

    await waitFor(() =>
      expect(checkoutCart).toHaveBeenCalledWith({
        idempotencyKey: "00000000-0000-4000-8000-000000000000",
      }),
    );
  });

  it("shows the checkout failure state when payment is rejected", async () => {
    jest
      .mocked(checkoutCart)
      .mockRejectedValueOnce(new Error("payment failed"));
    render(<CartScreen />, { wrapper: createWrapper() });

    await fireEvent.press(await screen.findByTestId("e2e.checkout.submit"));

    expect(await screen.findByTestId("e2e.checkout.failure")).toBeVisible();
  });

  it("keeps the remaining cart cell identity after an item is removed", async () => {
    const user = userEvent.setup();
    jest
      .mocked(getCart)
      .mockResolvedValueOnce({
        ...cart,
        items: [...cart.items, secondCartItem],
        totalAmount: 32_000,
      })
      .mockResolvedValueOnce({
        ...cart,
        items: [secondCartItem],
        totalAmount: 24_000,
      });
    jest
      .mocked(removeCartItem)
      .mockResolvedValue({ removeCartItem: { cartId: cart.cartId } });
    render(<CartScreen />, { wrapper: createWrapper() });

    await screen.findByLabelText("장바구니 상품 목록");
    layoutLegendList("장바구니 상품 목록");
    fireEvent(screen.getByTestId("e2e.cart.item.sku-1"), "layout", {
      nativeEvent: {
        layout: { height: 104, width: 350, x: 0, y: 0 },
      },
    });
    fireEvent(screen.getByTestId("e2e.cart.item.sku-2"), "layout", {
      nativeEvent: {
        layout: { height: 104, width: 350, x: 0, y: 104 },
      },
    });
    expect(await screen.findByText("테스트 상품")).toBeVisible();
    expect(screen.getByText("두 번째 상품")).toBeVisible();
    await user.press(screen.getByTestId("e2e.cart.remove.sku-1"));

    await waitFor(() =>
      expect(screen.queryByText("테스트 상품")).not.toBeOnTheScreen(),
    );
    expect(screen.getByText("두 번째 상품")).toBeVisible();
    expect(screen.getByText("아이보리 / L")).toBeVisible();
    expect(removeCartItem).toHaveBeenCalledTimes(1);
    expect(jest.mocked(removeCartItem).mock.calls[0]?.[0]).toBe("sku-1");
  });

  it("opens a product route from a rendered wish item", async () => {
    render(<WishScreen />, { wrapper: createWrapper() });

    await screen.findByLabelText("위시 상품 목록");
    layoutLegendList("위시 상품 목록");
    fireEvent(screen.getByTestId("e2e.product.open.product-1"), "layout", {
      nativeEvent: {
        layout: { height: 320, width: 358, x: 0, y: 0 },
      },
    });
    await fireEvent.press(
      await screen.findByTestId("e2e.product.open.product-1"),
    );

    expect(mockNavigation.path).toBe("/product/product-1");
    expect(screen.getByText("테스트 상품")).toBeVisible();
  });
});
