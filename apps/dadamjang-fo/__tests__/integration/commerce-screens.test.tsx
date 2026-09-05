import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import { getSessionGeneration } from "@dadamjang/graphql-client";

import { AuthSessionStateProvider } from "@/features/auth/auth-session-state";
import { getCurrentUser } from "@/features/auth/api";
import { authQueryKeys } from "@/features/auth/hooks";
import {
  checkoutCart,
  getCart,
  getCheckoutAttempt,
  removeCartItem,
} from "@/features/cart/api";
import { cartQueryKeys } from "@/features/cart/query-keys";
import type {
  CheckoutAttempt,
  CheckoutCartResult,
} from "@/features/cart/types";
import { getOrder, getOrders } from "@/features/order/api";
import CartScreen from "@/app/cart";
import WishScreen from "@/app/(tabs)/wish";
import OrderDetailScreen from "@/app/order/[order-id]";
import OrdersScreen from "@/app/orders";
import { getWishlist } from "@/features/wish/api";
import type { Action } from "@dadamjang/mobile";
import { layoutLegendList } from "../helpers/layout-legend-list";

const mockNavigation: { path?: string } = {};
const mockSearchParams: { "order-id"?: string; forcePaymentFailure?: string } =
  {};

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void) => effect(),
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
  getCheckoutAttempt: jest.fn(),
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

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });

const createWrapper = (client = createQueryClient()) => {
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

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const settleBackgroundQueries = async (client: QueryClient) => {
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
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

const uncertainCheckoutAttempt: CheckoutAttempt = {
  userId: "user-1",
  generation: 0,
  idempotencyKey: "checkout-attempt-1",
  expectedCart: [
    {
      cartItemId: "cart-item-1",
      skuId: "sku-1",
      quantity: 1,
      unitPrice: 8_000,
      productId: "product-1",
      productTitle: "테스트 상품",
      optionName: "블랙 / M",
    },
  ],
  phase: "uncertain",
  startedAt: 1,
};

const storeCheckoutAttempt = (
  client: QueryClient,
  attempt: CheckoutAttempt,
) => {
  client.setQueryData(
    cartQueryKeys.checkoutAttempt("user-1", getSessionGeneration()),
    attempt,
  );
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
      hasPassword: true,
    });
    jest.mocked(getCart).mockResolvedValue(cart);
    jest.mocked(getCheckoutAttempt).mockResolvedValue({
      status: "NOT_OBSERVED",
      orderId: null,
    });
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
    jest
      .mocked(checkoutCart)
      .mockImplementation(() => new Promise(() => undefined));
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

  it("disables both recovery actions during the initial checkout request", async () => {
    jest
      .mocked(checkoutCart)
      .mockImplementation(() => new Promise(() => undefined));
    render(<CartScreen />, { wrapper: createWrapper() });

    await fireEvent.press(await screen.findByTestId("e2e.checkout.submit"));

    expect(
      await screen.findByRole("button", { name: "주문 결과 확인" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "주문 다시 시도" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "결제하기" })).toBeDisabled();
  });

  it("exposes cart and order retry controls as named buttons", async () => {
    jest.mocked(getCart).mockRejectedValueOnce(new Error("cart unavailable"));
    const cartScreen = render(<CartScreen />, { wrapper: createWrapper() });

    expect(await screen.findByRole("button", { name: "다시 시도" })).toHaveProp(
      "testID",
      "e2e.cart.retry",
    );
    cartScreen.unmount();

    jest
      .mocked(getOrders)
      .mockRejectedValueOnce(new Error("orders unavailable"));
    render(<OrdersScreen />, { wrapper: createWrapper() });

    expect(await screen.findByRole("button", { name: "다시 시도" })).toHaveProp(
      "testID",
      "e2e.order.retry",
    );
  });

  it("shows uncertain recovery and its snapshot before a cart read error", async () => {
    const client = createQueryClient();
    jest
      .mocked(getCart)
      .mockResolvedValueOnce(cart)
      .mockRejectedValueOnce(new Error("cart unavailable"));
    jest.mocked(checkoutCart).mockRejectedValueOnce(new Error("response lost"));
    render(<CartScreen />, { wrapper: createWrapper(client) });

    await fireEvent.press(await screen.findByTestId("e2e.checkout.submit"));

    expect(await screen.findByTestId("e2e.checkout.recovery")).toBeVisible();
    layoutLegendList("처음 요청한 상품 목록");
    expect(screen.getByText("테스트 상품")).toBeVisible();
    expect(screen.getByText("블랙 / M")).toBeVisible();
    expect(screen.getByText("수량 1개 · 단가 8,000원")).toBeVisible();
    expect(
      screen.queryByText("장바구니를 불러오지 못했어요."),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText("장바구니가 비어 있어요.")).not.toBeOnTheScreen();
    await settleBackgroundQueries(client);
  });

  it("keeps a submitting attempt visible when the cart cannot load", async () => {
    const client = createQueryClient();
    storeCheckoutAttempt(client, {
      ...uncertainCheckoutAttempt,
      phase: "submitting",
    });
    jest.mocked(getCart).mockRejectedValueOnce(new Error("cart unavailable"));
    render(<CartScreen />, { wrapper: createWrapper(client) });

    expect(await screen.findByTestId("e2e.checkout.recovery")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "주문 결과 확인" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "주문 다시 시도" }),
    ).toBeDisabled();
    expect(
      screen.queryByText("장바구니를 불러오지 못했어요."),
    ).not.toBeOnTheScreen();
    await settleBackgroundQueries(client);
  });

  it("explains recovery actions and session limits", async () => {
    const client = createQueryClient();
    storeCheckoutAttempt(client, uncertainCheckoutAttempt);
    render(<CartScreen />, { wrapper: createWrapper(client) });

    expect(
      await screen.findByText(
        "처음 보낸 주문 요청이 아직 처리 중일 수 있어요.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("주문 결과 확인은 주문을 만들지 않고 결과만 조회해요."),
    ).toBeVisible();
    expect(
      screen.getByText(
        "주문 다시 시도는 기존 주문이 완료되지 않은 경우에만 표시된 상품으로 주문을 만들 수 있어요.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "앱을 종료하거나 로그아웃하면 이 주문 시도는 복원되지 않아요.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "장바구니 내용이 바뀌어도 새 주문을 자동으로 시작하지 않아요.",
      ),
    ).toBeVisible();
    await settleBackgroundQueries(client);
  });

  it("checks without retrying and disables both recovery actions while busy", async () => {
    const client = createQueryClient();
    const lookup = deferred<{ status: "NOT_OBSERVED"; orderId: null }>();
    storeCheckoutAttempt(client, uncertainCheckoutAttempt);
    jest.mocked(getCheckoutAttempt).mockReturnValueOnce(lookup.promise);
    render(<CartScreen />, { wrapper: createWrapper(client) });
    const check = await screen.findByRole("button", {
      name: "주문 결과 확인",
    });
    const retry = screen.getByRole("button", { name: "주문 다시 시도" });

    expect(check).toHaveProp("testID", "e2e.checkout.check");
    expect(retry).toHaveProp("testID", "e2e.checkout.retry");
    await fireEvent.press(check);

    await waitFor(() => expect(getCheckoutAttempt).toHaveBeenCalledTimes(1));
    expect(checkoutCart).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "주문 결과 확인" }),
      ).toBeDisabled(),
    );
    expect(
      screen.getByRole("button", { name: "주문 다시 시도" }),
    ).toBeDisabled();
    await act(async () => {
      lookup.resolve({ status: "NOT_OBSERVED", orderId: null });
      await lookup.promise;
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "주문 결과 확인" }),
      ).toBeEnabled(),
    );
    await settleBackgroundQueries(client);
  });

  it("retries the stored checkout and disables both recovery actions while busy", async () => {
    const client = createQueryClient();
    const retryRequest = deferred<CheckoutCartResult>();
    storeCheckoutAttempt(client, uncertainCheckoutAttempt);
    jest.mocked(checkoutCart).mockReturnValueOnce(retryRequest.promise);
    render(<CartScreen />, { wrapper: createWrapper(client) });

    await fireEvent.press(
      await screen.findByRole("button", { name: "주문 다시 시도" }),
    );

    await waitFor(() =>
      expect(checkoutCart).toHaveBeenCalledWith({
        idempotencyKey: "checkout-attempt-1",
        expectedCart: [
          {
            cartItemId: "cart-item-1",
            skuId: "sku-1",
            quantity: 1,
            unitPrice: 8_000,
          },
        ],
      }),
    );
    expect(getCheckoutAttempt).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "주문 결과 확인" }),
      ).toBeDisabled(),
    );
    expect(
      screen.getByRole("button", { name: "주문 다시 시도" }),
    ).toBeDisabled();
    await act(async () => {
      retryRequest.resolve({
        orderId: "order-1",
        orderNumber: "20260812-1",
        status: "PAYMENT_PENDING",
        paymentStatus: "PENDING",
        totalAmount: 8_000,
      });
      await retryRequest.promise;
    });
    await waitFor(() => expect(mockNavigation.path).toBe("/order/order-1"));
    await settleBackgroundQueries(client);
  });

  it("opens the original order after a confirmed lookup despite cart refetch failure", async () => {
    const client = createQueryClient();
    storeCheckoutAttempt(client, uncertainCheckoutAttempt);
    jest
      .mocked(getCart)
      .mockResolvedValueOnce(cart)
      .mockRejectedValueOnce(new Error("cart unavailable"));
    jest.mocked(getCheckoutAttempt).mockResolvedValueOnce({
      status: "CONFIRMED",
      orderId: "original-order",
    });
    render(<CartScreen />, { wrapper: createWrapper(client) });

    await fireEvent.press(
      await screen.findByRole("button", { name: "주문 결과 확인" }),
    );

    await waitFor(() =>
      expect(mockNavigation.path).toBe("/order/original-order"),
    );
    expect(checkoutCart).not.toHaveBeenCalled();
    await settleBackgroundQueries(client);
    expect(getCart).toHaveBeenCalledTimes(2);
  });

  it("opens a confirmed cached order on re-entry before a cart error", async () => {
    const client = createQueryClient();
    storeCheckoutAttempt(client, {
      ...uncertainCheckoutAttempt,
      phase: "confirmed",
      orderId: "cached-order",
    });
    jest.mocked(getCart).mockRejectedValueOnce(new Error("cart unavailable"));
    render(<CartScreen />, { wrapper: createWrapper(client) });

    await waitFor(() =>
      expect(mockNavigation.path).toBe("/order/cached-order"),
    );
    await settleBackgroundQueries(client);
  });

  it("keeps lookup but omits retry for a snapshotless attempt", async () => {
    const client = createQueryClient();
    storeCheckoutAttempt(client, {
      userId: "user-1",
      generation: 0,
      idempotencyKey: "legacy-checkout",
      phase: "uncertain",
      startedAt: 1,
    });
    jest.mocked(getCart).mockRejectedValueOnce(new Error("cart unavailable"));
    render(<CartScreen />, { wrapper: createWrapper(client) });

    expect(
      await screen.findByRole("button", { name: "주문 결과 확인" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "주문 다시 시도" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByText(
        "처음 요청한 상품 정보가 남아 있지 않아 결과만 확인할 수 있어요.",
      ),
    ).toBeVisible();
    await settleBackgroundQueries(client);
  });

  it.each([
    [
      "lookup",
      () =>
        jest
          .mocked(getCheckoutAttempt)
          .mockRejectedValueOnce(new Error("offline")),
    ],
    [
      "retry",
      () =>
        jest.mocked(checkoutCart).mockRejectedValueOnce(new Error("offline")),
    ],
  ] as const)(
    "describes a %s communication error without declaring the order failed",
    async (action, failRequest) => {
      const client = createQueryClient();
      storeCheckoutAttempt(client, uncertainCheckoutAttempt);
      failRequest();
      render(<CartScreen />, { wrapper: createWrapper(client) });

      await fireEvent.press(
        await screen.findByRole("button", {
          name: action === "lookup" ? "주문 결과 확인" : "주문 다시 시도",
        }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "통신 중 주문 결과를 확인하지 못했어요. 주문이 실패한 것으로 확인된 것은 아니에요.",
      );
      expect(screen.queryByText(/결제에 실패했어요/)).not.toBeOnTheScreen();
      await settleBackgroundQueries(client);
    },
  );

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

    expect(screen.getByRole("button", { name: "20260829-1" })).toBeEnabled();
  });

  it.each([
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
  ] as const)(
    "renders $status + $paymentStatus as $testID",
    async ({
      status,
      paymentStatus,
      headline,
      testID,
      orderLabel,
      paymentLabel,
    }) => {
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

  it("submits a fixed key and four-field snapshot without test controls", async () => {
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
        expectedCart: [
          {
            cartItemId: "cart-item-1",
            skuId: "sku-1",
            quantity: 1,
            unitPrice: 8_000,
          },
        ],
      }),
    );
  });

  it("shows an explicit order-request rejection and allows a fresh checkout", async () => {
    jest
      .mocked(checkoutCart)
      .mockRejectedValueOnce(
        Object.assign(new Error("checkout rejected"), {
          code: "BAD_USER_INPUT",
        }),
      )
      .mockImplementationOnce(() => new Promise(() => undefined));
    render(<CartScreen />, { wrapper: createWrapper() });

    await fireEvent.press(await screen.findByTestId("e2e.checkout.submit"));

    expect(
      await screen.findByTestId("e2e.checkout.rejected"),
    ).toHaveTextContent(
      "주문 요청이 거절됐어요. 장바구니 내용을 확인한 뒤 다시 시도해 주세요.",
    );
    expect(screen.queryByText(/결제에 실패했어요/)).not.toBeOnTheScreen();
    const checkout = screen.getByRole("button", { name: "결제하기" });
    expect(checkout).toBeEnabled();
    await fireEvent.press(checkout);
    await waitFor(() => expect(checkoutCart).toHaveBeenCalledTimes(2));
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
