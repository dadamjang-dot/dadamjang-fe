import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import { getSessionGeneration } from "@dadamjang/graphql-client";

import CartScreen from "@/app/cart";
import { getCurrentUser } from "@/features/auth/api";
import { AuthSessionStateProvider } from "@/features/auth/auth-session-state";
import { authQueryKeys } from "@/features/auth/hooks";
import { checkoutCart, getCart, getCheckoutAttempt } from "@/features/cart/api";
import { cartQueryKeys } from "@/features/cart/query-keys";
import type { CheckoutAttempt } from "@/features/cart/types";

const mockNavigation: { path?: string } = {};

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: (path: string) => {
      mockNavigation.path = path;
    },
    replace: (path: string) => {
      mockNavigation.path = path;
    },
  }),
}));

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

const createClient = () => {
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
  return client;
};

const createWrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthSessionStateProvider
        value={{ error: null, hasSession: true, retry: async () => undefined }}
      >
        {children}
      </AuthSessionStateProvider>
    </QueryClientProvider>
  );
  Wrapper.displayName = "AndroidCheckoutRecoveryWrapper";
  return Wrapper;
};

const attempt = (run: number): CheckoutAttempt => ({
  userId: "user-1",
  generation: getSessionGeneration(),
  idempotencyKey: `android-checkout-${run}`,
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
});

const storeAttempt = (
  client: QueryClient,
  checkoutAttempt: CheckoutAttempt,
) => {
  client.setQueryData(
    cartQueryKeys.checkoutAttempt(
      checkoutAttempt.userId,
      checkoutAttempt.generation,
    ),
    checkoutAttempt,
  );
};

const deferred = <T,>() => {
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((_resolve, fail) => {
    reject = fail;
  });
  return { promise, reject };
};

describe("Android checkout recovery", () => {
  beforeEach(() => {
    delete mockNavigation.path;
    jest.clearAllMocks();
    jest.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      userid: "buyer",
      email: "buyer@example.com",
      role: "USER",
      hasPassword: true,
    });
    jest.mocked(getCart).mockRejectedValue(new Error("cart unavailable"));
  });

  it.each([1, 2, 3, 4, 5])(
    "D3 opens the committed original order without retrying run %i",
    async (run) => {
      const client = createClient();
      const checkoutAttempt = attempt(run);
      const orderId = `original-order-${run}`;
      storeAttempt(client, checkoutAttempt);
      jest
        .mocked(getCheckoutAttempt)
        .mockResolvedValueOnce({ status: "CONFIRMED", orderId });
      const view = render(<CartScreen />, { wrapper: createWrapper(client) });

      await fireEvent.press(
        await screen.findByRole("button", { name: "주문 결과 확인" }),
      );

      await waitFor(() =>
        expect(mockNavigation.path).toBe(`/order/${orderId}`),
      );
      expect(checkoutCart).not.toHaveBeenCalled();
      expect(
        client.getQueryData<CheckoutAttempt>(
          cartQueryKeys.checkoutAttempt("user-1", checkoutAttempt.generation),
        ),
      ).toMatchObject({
        idempotencyKey: checkoutAttempt.idempotencyKey,
        orderId,
        phase: "confirmed",
      });
      view.unmount();
      client.clear();
    },
  );

  it.each([1, 2, 3, 4, 5])(
    "D9 keeps recovery through a cart error and screen re-entry run %i",
    async (run) => {
      const client = createClient();
      const checkoutAttempt = attempt(run);
      storeAttempt(client, checkoutAttempt);
      jest
        .mocked(getCheckoutAttempt)
        .mockResolvedValueOnce({ status: "NOT_OBSERVED", orderId: null });
      const first = render(<CartScreen />, { wrapper: createWrapper(client) });

      expect(await screen.findByTestId("e2e.checkout.recovery")).toBeVisible();
      first.unmount();
      const second = render(<CartScreen />, { wrapper: createWrapper(client) });
      await fireEvent.press(
        await screen.findByRole("button", { name: "주문 결과 확인" }),
      );

      await waitFor(() =>
        expect(getCheckoutAttempt).toHaveBeenCalledWith(
          checkoutAttempt.idempotencyKey,
          expect.anything(),
        ),
      );
      await waitFor(() =>
        expect(
          client.getQueryData<CheckoutAttempt>(
            cartQueryKeys.checkoutAttempt("user-1", checkoutAttempt.generation),
          ),
        ).toMatchObject({
          idempotencyKey: checkoutAttempt.idempotencyKey,
          expectedCart: checkoutAttempt.expectedCart,
          phase: "uncertain",
        }),
      );
      second.unmount();
      client.clear();
    },
  );

  it.each([1, 2, 3, 4, 5])(
    "D10 does not regress a confirmed screen after a late lookup error run %i",
    async (run) => {
      const client = createClient();
      const checkoutAttempt = attempt(run);
      const lookup = deferred<{ status: "CONFIRMED"; orderId: string }>();
      const orderId = `confirmed-order-${run}`;
      storeAttempt(client, checkoutAttempt);
      jest.mocked(getCheckoutAttempt).mockReturnValueOnce(lookup.promise);
      const view = render(<CartScreen />, { wrapper: createWrapper(client) });

      await fireEvent.press(
        await screen.findByRole("button", { name: "주문 결과 확인" }),
      );
      await waitFor(() =>
        expect(
          client.getQueryData<CheckoutAttempt>(
            cartQueryKeys.checkoutAttempt("user-1", checkoutAttempt.generation),
          )?.phase,
        ).toBe("checking"),
      );
      act(() => {
        storeAttempt(client, {
          ...checkoutAttempt,
          orderId,
          phase: "confirmed",
        });
      });
      await waitFor(() =>
        expect(mockNavigation.path).toBe(`/order/${orderId}`),
      );
      await act(async () => {
        lookup.reject(new Error("late lookup failure"));
        await lookup.promise.catch(() => undefined);
      });

      expect(
        client.getQueryData<CheckoutAttempt>(
          cartQueryKeys.checkoutAttempt("user-1", checkoutAttempt.generation),
        ),
      ).toMatchObject({
        idempotencyKey: checkoutAttempt.idempotencyKey,
        orderId,
        phase: "confirmed",
      });
      view.unmount();
      client.clear();
    },
  );
});
