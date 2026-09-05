import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";
import { getProducts } from "@/features/catalog/api";
import { useProductSearch } from "@/features/catalog/hooks";
import type { Product } from "@/features/catalog/types";
import { SearchContent } from "@/shared/components/search-content";

jest.mock("@/features/catalog/api", () => ({ getProducts: jest.fn() }));
jest.mock("@/shared/components", () => ({
  ...jest.requireActual("@/shared/components/button"),
  ...jest.requireActual("@/shared/components/product-card"),
}));
jest.mock("@/features/auth", () => ({
  useAuthActionGate: () => ({
    isAuthenticated: false,
    runProtectedAction: () => false,
  }),
}));
jest.mock("@/features/wish", () => ({
  useWishlist: () => ({ data: [] }),
  useWishActions: () => ({ add: {}, remove: {} }),
}));
jest.mock("expo-router", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("@legendapp/list/react-native", () => {
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    LegendList: ({
      data,
      renderItem,
      ListFooterComponent,
      ...props
    }: {
      data: Product[];
      renderItem: (value: { item: Product }) => ReactNode;
      ListFooterComponent?: ReactNode;
    }) => (
      <View {...props}>
        {data.map((item) => (
          <View key={item.productId}>{renderItem({ item })}</View>
        ))}
        {ListFooterComponent}
      </View>
    ),
  };
});

const product = (id: string): Product => ({
  productId: id,
  partnerId: "partner",
  brandId: null,
  brand: null,
  categoryId: "category",
  title: `상품 ${id}`,
  description: "",
  imageUrls: [],
  status: "PUBLISHED",
  isOnSale: false,
  isExpressDelivery: false,
  skus: [],
  createdAt: "2026-09-01T00:00:00Z",
});
const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper: Wrapper };
};

it("loads beyond duplicate search pages when the user reaches the end", async () => {
  const { client, wrapper } = setup();
  jest.mocked(getProducts).mockImplementation(async ({ after }) => ({
    nodes: [product(after === "second" ? "21" : "1")],
    totalCount: 21,
    nextCursor:
      after === "second" ? null : after === "first" ? "second" : "first",
    hasNextPage: after !== "second",
  }));
  const { unmount } = render(<SearchContent keyword="상품" />, { wrapper });
  await screen.findByText("상품 1");
  await act(async () => {
    fireEvent(screen.getByLabelText("검색 상품 목록"), "endReached");
  });
  expect(await screen.findByText("상품 21")).toBeVisible();
  expect(screen.getAllByText("상품 1")).toHaveLength(1);
  act(() => {
    unmount();
    client.clear();
  });
});

it("terminates search pagination when the server repeats a cursor", async () => {
  const { client, wrapper } = setup();
  jest
    .mocked(getProducts)
    .mockResolvedValue({
      nodes: [product("1")],
      totalCount: 21,
      nextCursor: "same",
      hasNextPage: true,
    });
  const { result, unmount } = renderHook(() => useProductSearch("상품"), {
    wrapper,
  });
  await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
  await act(async () => {
    await result.current.fetchNextPage();
  });
  await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  expect(result.current.hasNextPage).toBe(false);
  expect(result.current.data?.pages).toHaveLength(2);
  act(() => {
    unmount();
    client.clear();
  });
});
