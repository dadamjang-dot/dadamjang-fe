import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Alert } from "react-native";

import ShopScreen from "@/app/(tabs)";
import { Sentry } from "@/shared/observability/sentry";

const mockAddWish = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/features/auth", () => ({
  useAuthActionGate: () => ({
    authStatus: "authenticated",
    data: { userId: "user-1" },
    isAuthenticated: true,
    runProtectedAction: (action: () => void) => {
      action();
      return true;
    },
  }),
}));

jest.mock("@/features/catalog", () => ({
  toProductFilter: jest.fn(() => ({})),
  useCategories: () => ({ data: [] }),
  useShopFilters: () => ({
    filters: {},
    startDraft: jest.fn(),
    updateFilters: jest.fn(),
  }),
}));

jest.mock("@/features/price-evidence", () => ({
  priceEvidenceQueryKeys: {
    productPriceSummary: (filter: unknown) => ["product-price-summaries", filter],
  },
  useProductPriceSummaries: () => ({
    data: { pages: [{ nodes: [], totalCount: 0 }] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/features/wish", () => ({
  useWishActions: () => ({
    add: { mutateAsync: mockAddWish },
    remove: { mutateAsync: jest.fn() },
  }),
  useWishlist: () => ({ data: [] }),
}));

jest.mock("@/features/shop", () => {
  const { Pressable: MockPressable } = jest.requireActual("react-native");
  return {
    ShopCategoryBar: () => null,
    ShopFilterBar: () => null,
    ShopProductGrid: ({
      onToggleLike,
    }: {
      onToggleLike: (productId: string, nextLiked: boolean) => void;
    }) => (
      <MockPressable
        testID="shop.toggle-like"
        onPress={() => onToggleLike("product-1", true)}
      />
    ),
    ShopSortBar: () => null,
  };
});

jest.mock("@/shared/components", () => {
  const { View: MockView } = jest.requireActual("react-native");
  return {
    ProductLayout: ({ children }: { children: ReactNode }) => (
      <MockView>{children}</MockView>
    ),
  };
});

describe("ShopScreen wishlist failures", () => {
  it("reports the error and tells the user the optimistic update failed", async () => {
    const error = new Error("wishlist unavailable");
    mockAddWish.mockRejectedValue(error);
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

    render(<ShopScreen />);
    fireEvent.press(screen.getByTestId("shop.toggle-like"));

    await waitFor(() => {
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
      expect(Alert.alert).toHaveBeenCalledWith(
        "찜을 저장하지 못했어요.",
        "잠시 후 다시 시도해 주세요.",
      );
    });
  });
});
