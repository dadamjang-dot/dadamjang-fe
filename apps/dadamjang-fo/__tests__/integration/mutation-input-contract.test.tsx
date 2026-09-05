import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useCartActions } from "@/features/cart/hooks";
import { checkoutCart } from "@/features/cart/api";
import { useToggleStylePostLike } from "@/features/style/hooks";
import { likeStylePost } from "@/features/style/api";
import { useWishActions } from "@/features/wish/hooks";
import { addWish } from "@/features/wish/api";
import { useUpdateFoNotificationPreferences } from "@/features/notification/hooks";
import { updateFoNotificationPreferences } from "@/features/notification/api";

jest.mock("@dadamjang/graphql-client", () => ({
  getSessionGeneration: () => 0,
}));
jest.mock("@/features/cart/api", () => ({ checkoutCart: jest.fn() }));
jest.mock("@/features/style/api", () => ({ likeStylePost: jest.fn() }));
jest.mock("@/features/wish/api", () => ({ addWish: jest.fn() }));
jest.mock("@/features/notification/api", () => ({
  updateFoNotificationPreferences: jest.fn(),
}));

type Contract<Input> = {
  variables: Input | undefined;
  mutateAsync: (
    input: Input,
    options?: {
      onSuccess?: (data: unknown, variables: Input) => void;
      onError?: (error: Error, variables: Input) => void;
      onSettled?: (
        data: unknown,
        error: Error | null,
        variables: Input,
      ) => void;
    },
  ) => Promise<unknown>;
};

const assertContract = async <Input,>(
  hook: () => Contract<Input>,
  input: Input,
  reject: () => void,
) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(hook, { wrapper: Wrapper });
  const observed: unknown[] = [];
  const options = {
    onSuccess: (_data: unknown, variables: Input) => {
      observed.push(["success", variables]);
    },
    onError: (_error: Error, variables: Input) => {
      observed.push(["error", variables]);
    },
    onSettled: (_data: unknown, _error: Error | null, variables: Input) => {
      observed.push(["settled", variables]);
    },
  };
  await act(async () => {
    await result.current.mutateAsync(input, options);
  });
  await waitFor(() => expect(result.current.variables).toBe(input));
  reject();
  await act(async () => {
    await result.current.mutateAsync(input, options).catch(() => undefined);
  });
  expect(observed).toEqual([
    ["success", input],
    ["settled", input],
    ["error", input],
    ["settled", input],
  ]);
  expect(result.current.variables).toBe(input);
  act(() => {
    unmount();
    client.clear();
  });
};

it("keeps checkout variables undefined at both public boundaries", async () => {
  jest
    .mocked(checkoutCart)
    .mockResolvedValue({
      orderId: "order",
      orderNumber: "1",
      status: "PAID",
      paymentStatus: "APPROVED",
      totalAmount: 1,
    });
  await assertContract(
    () => useCartActions().checkout,
    undefined,
    () => jest.mocked(checkoutCart).mockRejectedValueOnce(new Error("failed")),
  );
});

it("keeps style variables free of the internal session generation", async () => {
  jest.mocked(likeStylePost).mockResolvedValue({
    stylePostId: "style",
    authorId: "author",
    author: { userId: "author", userid: "author" },
    title: "Style",
    content: "Style",
    category: "CLOTHING",
    imageUrls: [],
    thumbnailUrl: null,
    hashtags: [],
    brandTags: [],
    products: [],
    isPartner: false,
    isLiked: true,
    likeCount: 1,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  });
  await assertContract(
    useToggleStylePostLike,
    { stylePostId: "style", nextLiked: true },
    () => jest.mocked(likeStylePost).mockRejectedValueOnce(new Error("failed")),
  );
});

it("keeps wish variables as the product id", async () => {
  jest.mocked(addWish).mockResolvedValue(undefined);
  await assertContract(
    () => useWishActions().add,
    "product",
    () => jest.mocked(addWish).mockRejectedValueOnce(new Error("failed")),
  );
});

it("keeps preference variables as the original partial input", async () => {
  jest
    .mocked(updateFoNotificationPreferences)
    .mockResolvedValue({
      pushEnabled: true,
      orderPushEnabled: true,
      wishPushEnabled: true,
      stylePushEnabled: true,
      updatedAt: "2026-09-01T00:00:00Z",
    });
  await assertContract(
    useUpdateFoNotificationPreferences,
    { pushEnabled: true },
    () =>
      jest
        .mocked(updateFoNotificationPreferences)
        .mockRejectedValueOnce(new Error("failed")),
  );
});
