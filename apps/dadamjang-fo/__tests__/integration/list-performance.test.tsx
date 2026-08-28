import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import ShopScreen from "@/app/(tabs)/shop";
import StyleScreen from "@/app/(tabs)/style";
import OrdersScreen from "@/app/orders";
import { AuthSessionStateProvider, authQueryKeys } from "@/features/auth";
import {
  catalogQueryKeys,
  defaultShopFilters,
  ShopFiltersProvider,
  toProductFilter,
} from "@/features/catalog";
import { orderQueryKeys, type Order } from "@/features/order";
import {
  priceEvidenceQueryKeys,
  type ProductPriceSummary,
  type ProductPriceSummaryConnection,
} from "@/features/price-evidence";
import { getProductPriceSummaries } from "@/features/price-evidence/api";
import { getLikedStylePosts, getStylePosts } from "@/features/style/api";
import { styleQueryKeys } from "@/features/style/hooks";
import type { StylePost, StylePostConnection } from "@/features/style/types";
import WishStylesTab from "@/features/wish/components/wish-styles-tab";
import { wishQueryKeys } from "@/features/wish/hooks";

const navigation: { path?: string } = {};
const mockLegendListRenders: {
  accessibilityLabel?: string;
  keys: string[];
  numColumns?: number;
}[] = [];
const mockLegendListEndSessions = new Map<string, () => void>();

const mockReachLegendListEnd = (accessibilityLabel: string) => {
  const reachEnd = mockLegendListEndSessions.get(accessibilityLabel);
  if (!reachEnd) throw new Error(`${accessibilityLabel} was not rendered`);
  reachEnd();
};

const requiredAt = <T,>(values: readonly T[], index: number) => {
  const value = values[index];
  if (value === undefined) throw new Error(`Missing item at index ${index}`);
  return value;
};

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: (path: string) => {
      navigation.path = path;
    },
  }),
}));

jest.mock("@legendapp/list/react-native", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View: NativeView } = jest.requireActual("react-native");

  const LegendList = ({
    accessibilityLabel,
    data,
    keyExtractor,
    ListFooterComponent,
    numColumns,
    onEndReached,
    renderItem,
    style,
    testID,
  }: {
    accessibilityLabel?: string;
    data: unknown[];
    keyExtractor?: (item: unknown, index: number) => string;
    ListFooterComponent?: ReactNode;
    numColumns?: number;
    onEndReached?: (info: { distanceFromEnd: number }) => void;
    renderItem: (info: { item: unknown; index: number }) => ReactNode;
    style?: unknown;
    testID?: string;
  }) => {
    const endReachedDataLength = React.useRef<number | undefined>(undefined);

    mockLegendListRenders.push({
      accessibilityLabel,
      keys: data.map(
        (item, index) => keyExtractor?.(item, index) ?? String(index),
      ),
      numColumns,
    });

    React.useEffect(() => {
      if (!accessibilityLabel) return;

      const reachEnd = () => {
        if (data.length === 0) return;
        endReachedDataLength.current = data.length;
        onEndReached?.({ distanceFromEnd: 0 });
      };

      mockLegendListEndSessions.set(accessibilityLabel, reachEnd);
      return () => {
        if (mockLegendListEndSessions.get(accessibilityLabel) === reachEnd) {
          mockLegendListEndSessions.delete(accessibilityLabel);
        }
      };
    }, [accessibilityLabel, data.length, onEndReached]);

    React.useEffect(() => {
      if (data.length > 0 && endReachedDataLength.current !== data.length) {
        endReachedDataLength.current = data.length;
        onEndReached?.({ distanceFromEnd: 0 });
      }
    }, [data.length, onEndReached]);

    return React.createElement(
      NativeView,
      { accessibilityLabel, style, testID },
      data.map((item, index) =>
        React.createElement(
          React.Fragment,
          { key: keyExtractor?.(item, index) ?? index },
          renderItem({ item, index }),
        ),
      ),
      ListFooterComponent,
    );
  };

  return { LegendList };
});

jest.mock("@/features/price-evidence/api", () => ({
  ...jest.requireActual("@/features/price-evidence/api"),
  getProductPriceSummaries: jest.fn(),
}));

jest.mock("@/features/style/api", () => ({
  ...jest.requireActual("@/features/style/api"),
  getLikedStylePosts: jest.fn(),
  getStylePosts: jest.fn(),
}));

jest.mock("@/shared/components", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View: NativeView } = jest.requireActual("react-native");
  const { Button } = jest.requireActual("@/shared/components/button");
  const { ProductCard } = jest.requireActual(
    "@/shared/components/product-card",
  );

  return {
    Button,
    ProductCard,
    ProductLayout: ({ children }: { children: ReactNode }) =>
      React.createElement(NativeView, null, children),
  };
});

const viewer = {
  userId: "user-1",
  userid: "buyer",
  email: "buyer@example.com",
  role: "USER" as const,
};

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false, staleTime: Infinity },
    },
  });

const createWrapper = (client: QueryClient) => {
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthSessionStateProvider
        value={{ error: null, hasSession: true, retry: async () => undefined }}
      >
        {children}
      </AuthSessionStateProvider>
    </QueryClientProvider>
  );
  TestWrapper.displayName = "ListPerformanceTestWrapper";
  return TestWrapper;
};

const createShopWrapper = (client: QueryClient) => {
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthSessionStateProvider
        value={{ error: null, hasSession: true, retry: async () => undefined }}
      >
        <ShopFiltersProvider>{children}</ShopFiltersProvider>
      </AuthSessionStateProvider>
    </QueryClientProvider>
  );
  TestWrapper.displayName = "ShopListPerformanceTestWrapper";
  return TestWrapper;
};

const productSummary = (
  productId: string,
  name: string,
): ProductPriceSummary => ({
  productId,
  name,
  thumbnail: null,
  basePrice: 10_000,
  finalPrice: 8_000,
  priceRevision: `revision-${productId}`,
  lowestPriceEvidenceSummary: "최근 최저가",
  isOnSale: true,
  isExpressDelivery: false,
});

const stylePost = (stylePostId: string, hashtag: string): StylePost => ({
  stylePostId,
  authorId: "user-1",
  author: { userId: "user-1", userid: "buyer" },
  title: hashtag,
  content: hashtag,
  category: "CLOTHING",
  imageUrls: [],
  thumbnailUrl: null,
  hashtags: [hashtag],
  brandTags: [],
  products: [],
  isPartner: false,
  likeCount: 1,
  isLiked: true,
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
});

describe("virtualized list data flow", () => {
  beforeEach(() => {
    navigation.path = undefined;
    mockLegendListEndSessions.clear();
    mockLegendListRenders.length = 0;
  });

  it("renders each shop product ID once across mutable cursor pages", async () => {
    const client = createClient();
    const repeated = productSummary("product-1", "첫 상품");
    const next = productSummary("product-2", "둘째 상품");
    const filter = toProductFilter(defaultShopFilters);
    client.setQueryData(authQueryKeys.viewer, viewer);
    client.setQueryData(catalogQueryKeys.categories(), []);
    client.setQueryData(wishQueryKeys.wishlist(), []);
    client.setQueryData(priceEvidenceQueryKeys.productPriceSummary(filter), {
      pages: [
        {
          nodes: [repeated],
          totalCount: 2,
          nextCursor: "cursor-1",
          hasNextPage: true,
        },
        {
          nodes: [repeated, next],
          totalCount: 2,
          nextCursor: null,
          hasNextPage: false,
        },
      ],
      pageParams: [undefined, "cursor-1"],
    });

    render(<ShopScreen />, { wrapper: createShopWrapper(client) });

    expect(
      await screen.findAllByTestId("e2e.product.open.product-1"),
    ).toHaveLength(1);
    await fireEvent.press(screen.getByTestId("e2e.product.open.product-2"));
    expect(navigation.path).toBe("/product/product-2");
  });

  it("continues shop pagination after a duplicate-only page", async () => {
    const client = createClient();
    const first = productSummary("product-1", "첫 상품");
    const second = productSummary("product-2", "둘째 상품");
    const third = productSummary("product-3", "셋째 상품");
    const filter = toProductFilter(defaultShopFilters);
    client.setQueryData(authQueryKeys.viewer, viewer);
    client.setQueryData(catalogQueryKeys.categories(), []);
    client.setQueryData(wishQueryKeys.wishlist(), []);
    client.setQueryData(priceEvidenceQueryKeys.productPriceSummary(filter), {
      pages: [
        {
          nodes: [first, second],
          totalCount: 3,
          nextCursor: "cursor-1",
          hasNextPage: true,
        },
      ],
      pageParams: [undefined],
    });
    jest
      .mocked(getProductPriceSummaries)
      .mockResolvedValueOnce({
        nodes: [first],
        totalCount: 3,
        nextCursor: "cursor-2",
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        nodes: [third],
        totalCount: 3,
        nextCursor: null,
        hasNextPage: false,
      });

    render(<ShopScreen />, { wrapper: createShopWrapper(client) });

    expect(
      await screen.findByTestId("e2e.product.open.product-3"),
    ).toBeVisible();
    expect(getProductPriceSummaries).toHaveBeenCalledTimes(2);
    expect(jest.mocked(getProductPriceSummaries).mock.calls[0]?.[0].after).toBe(
      "cursor-1",
    );
    expect(jest.mocked(getProductPriceSummaries).mock.calls[1]?.[0].after).toBe(
      "cursor-2",
    );
  });

  it("does not continue an old shop loop after the filter query changes", async () => {
    const client = createClient();
    const firstA = productSummary("product-a-1", "A 첫 상품");
    const secondA = productSummary("product-a-2", "A 둘째 상품");
    const firstB = productSummary("product-b-1", "B 첫 상품");
    const secondB = productSummary("product-b-2", "B 둘째 상품");
    const unexpectedB = productSummary("product-b-3", "B 셋째 상품");
    const filterA = toProductFilter(defaultShopFilters);
    const filterB = toProductFilter({
      ...defaultShopFilters,
      categoryId: "category-b",
    });
    let resolvePageA!: (page: ProductPriceSummaryConnection) => void;
    const pageA = new Promise<ProductPriceSummaryConnection>((resolve) => {
      resolvePageA = resolve;
    });
    client.setQueryData(authQueryKeys.viewer, viewer);
    client.setQueryData(catalogQueryKeys.categories(), [
      {
        categoryId: "category-b",
        name: "카테고리 B",
        slug: "category-b",
        parentId: null,
        sortOrder: 1,
      },
    ]);
    client.setQueryData(wishQueryKeys.wishlist(), []);
    client.setQueryData(priceEvidenceQueryKeys.productPriceSummary(filterA), {
      pages: [
        {
          nodes: [firstA, secondA],
          totalCount: 3,
          nextCursor: "cursor-a-1",
          hasNextPage: true,
        },
      ],
      pageParams: [undefined],
    });
    client.setQueryData(priceEvidenceQueryKeys.productPriceSummary(filterB), {
      pages: [
        {
          nodes: [firstB, secondB],
          totalCount: 3,
          nextCursor: "cursor-b-1",
          hasNextPage: true,
        },
      ],
      pageParams: [undefined],
    });
    jest
      .mocked(getProductPriceSummaries)
      .mockImplementation(({ categoryId }) =>
        categoryId === "category-b"
          ? Promise.resolve({
              nodes: [unexpectedB],
              totalCount: 3,
              nextCursor: null,
              hasNextPage: false,
            })
          : pageA,
      );

    render(<ShopScreen />, { wrapper: createShopWrapper(client) });

    await waitFor(() => expect(getProductPriceSummaries).toHaveBeenCalled());
    fireEvent.press(screen.getByText("카테고리 B"));
    expect(
      await screen.findByTestId("e2e.product.open.product-b-2"),
    ).toBeVisible();

    resolvePageA({
      nodes: [firstA],
      totalCount: 3,
      nextCursor: "cursor-a-2",
      hasNextPage: true,
    });
    await waitFor(() => expect(client.isFetching()).toBe(0));

    expect(
      jest
        .mocked(getProductPriceSummaries)
        .mock.calls.filter(([filter]) => filter.categoryId === "category-b"),
    ).toHaveLength(0);
    expect(screen.queryByTestId("e2e.product.open.product-b-3")).toBeNull();
  });

  it("keeps a new shop item and permanently stops its repeated cursor", async () => {
    const client = createClient();
    const first = productSummary("product-1", "첫 상품");
    const second = productSummary("product-2", "둘째 상품");
    const third = productSummary("product-3", "셋째 상품");
    const filter = toProductFilter(defaultShopFilters);
    client.setQueryData(authQueryKeys.viewer, viewer);
    client.setQueryData(catalogQueryKeys.categories(), []);
    client.setQueryData(wishQueryKeys.wishlist(), []);
    client.setQueryData(priceEvidenceQueryKeys.productPriceSummary(filter), {
      pages: [
        {
          nodes: [first, second],
          totalCount: 3,
          nextCursor: "cursor-1",
          hasNextPage: true,
        },
      ],
      pageParams: [undefined],
    });
    jest.mocked(getProductPriceSummaries).mockResolvedValue({
      nodes: [third],
      totalCount: 3,
      nextCursor: "cursor-1",
      hasNextPage: true,
    });

    render(<ShopScreen />, { wrapper: createShopWrapper(client) });

    expect(
      await screen.findByTestId("e2e.product.open.product-3"),
    ).toBeVisible();
    await waitFor(() => expect(client.isFetching()).toBe(0));

    act(() => mockReachLegendListEnd("상품 목록"));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    act(() => mockReachLegendListEnd("상품 목록"));
    await waitFor(() => expect(client.isFetching()).toBe(0));

    expect(getProductPriceSummaries).toHaveBeenCalledTimes(1);
  });

  it("renders each main style post ID once across mutable cursor pages", async () => {
    const client = createClient();
    const repeated = stylePost("style-1", "first");
    const next = stylePost("style-2", "second");
    client.setQueryData(authQueryKeys.viewer, viewer);
    client.setQueryData(styleQueryKeys.posts(undefined, "RECOMMENDED"), {
      pages: [
        { nodes: [repeated], nextCursor: "cursor-1", hasNextPage: true },
        { nodes: [repeated, next], nextCursor: null, hasNextPage: false },
      ],
      pageParams: [undefined, "cursor-1"],
    });

    render(<StyleScreen />, { wrapper: createWrapper(client) });

    expect(await screen.findAllByText("#first")).toHaveLength(1);
    await fireEvent.press(
      requiredAt(screen.getAllByLabelText("스타일 게시물 이미지"), 1),
    );
    expect(navigation.path).toBe("/style/style-2");
  });

  it("continues style pagination when an odd addition keeps row count stable", async () => {
    const client = createClient();
    const first = stylePost("style-1", "first");
    const second = stylePost("style-2", "second");
    const third = stylePost("style-3", "third");
    const fourth = stylePost("style-4", "fourth");
    const fifth = stylePost("style-5", "fifth");
    client.setQueryData(authQueryKeys.viewer, viewer);
    client.setQueryData(styleQueryKeys.posts(undefined, "RECOMMENDED"), {
      pages: [
        {
          nodes: [first, second, third],
          nextCursor: "cursor-1",
          hasNextPage: true,
        },
      ],
      pageParams: [undefined],
    });
    jest
      .mocked(getStylePosts)
      .mockResolvedValueOnce({
        nodes: [fourth],
        nextCursor: "cursor-2",
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        nodes: [fifth],
        nextCursor: null,
        hasNextPage: false,
      });

    render(<StyleScreen />, { wrapper: createWrapper(client) });

    expect(await screen.findByText("#fifth")).toBeVisible();
    expect(getStylePosts).toHaveBeenCalledTimes(2);
    expect(jest.mocked(getStylePosts).mock.calls[0]?.[0].after).toBe(
      "cursor-1",
    );
    expect(jest.mocked(getStylePosts).mock.calls[1]?.[0].after).toBe(
      "cursor-2",
    );
  });

  it("keeps a new style post and permanently stops its repeated cursor", async () => {
    const client = createClient();
    const first = stylePost("style-1", "first");
    const second = stylePost("style-2", "second");
    const third = stylePost("style-3", "third");
    client.setQueryData(authQueryKeys.viewer, viewer);
    client.setQueryData(styleQueryKeys.posts(undefined, "RECOMMENDED"), {
      pages: [
        {
          nodes: [first, second],
          nextCursor: "cursor-1",
          hasNextPage: true,
        },
      ],
      pageParams: [undefined],
    });
    jest.mocked(getStylePosts).mockResolvedValue({
      nodes: [third],
      nextCursor: "cursor-1",
      hasNextPage: true,
    });

    render(<StyleScreen />, { wrapper: createWrapper(client) });

    expect(await screen.findByText("#third")).toBeVisible();
    await waitFor(() => expect(client.isFetching()).toBe(0));

    act(() => mockReachLegendListEnd("스타일 게시물 목록"));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    act(() => mockReachLegendListEnd("스타일 게시물 목록"));
    await waitFor(() => expect(client.isFetching()).toBe(0));

    expect(getStylePosts).toHaveBeenCalledTimes(1);
  });

  it("does not continue an old style loop after the feed query changes", async () => {
    const client = createClient();
    const firstA = stylePost("style-a-1", "a-first");
    const secondA = stylePost("style-a-2", "a-second");
    const firstB = stylePost("style-b-1", "b-first");
    const secondB = stylePost("style-b-2", "b-second");
    const unexpectedB = stylePost("style-b-3", "b-third");
    let resolvePageA!: (page: StylePostConnection) => void;
    const pageA = new Promise<StylePostConnection>((resolve) => {
      resolvePageA = resolve;
    });
    client.setQueryData(authQueryKeys.viewer, viewer);
    client.setQueryData(styleQueryKeys.posts(undefined, "RECOMMENDED"), {
      pages: [
        {
          nodes: [firstA, secondA],
          nextCursor: "cursor-a-1",
          hasNextPage: true,
        },
      ],
      pageParams: [undefined],
    });
    client.setQueryData(styleQueryKeys.posts("CLOTHING", "RECOMMENDED"), {
      pages: [
        {
          nodes: [firstB, secondB],
          nextCursor: "cursor-b-1",
          hasNextPage: true,
        },
      ],
      pageParams: [undefined],
    });
    jest.mocked(getStylePosts).mockImplementation(({ filter }) =>
      filter.category === "CLOTHING"
        ? Promise.resolve({
            nodes: [unexpectedB],
            nextCursor: null,
            hasNextPage: false,
          })
        : pageA,
    );

    render(<StyleScreen />, { wrapper: createWrapper(client) });

    await waitFor(() => expect(getStylePosts).toHaveBeenCalled());
    fireEvent.press(screen.getByText("의류"));
    expect(await screen.findByText("#b-second")).toBeVisible();

    resolvePageA({
      nodes: [firstA],
      nextCursor: "cursor-a-2",
      hasNextPage: true,
    });
    await waitFor(() => expect(client.isFetching()).toBe(0));

    expect(
      jest
        .mocked(getStylePosts)
        .mock.calls.filter(
          ([variables]) => variables.filter.category === "CLOTHING",
        ),
    ).toHaveLength(0);
    expect(screen.queryByText("#b-third")).toBeNull();
  });

  it("keeps manual liked-style pagination while deduplicating post IDs", async () => {
    const client = createClient();
    const repeated = stylePost("style-1", "first");
    const next = stylePost("style-2", "second");
    client.setQueryData(styleQueryKeys.likedPosts(), {
      pages: [{ nodes: [repeated], nextCursor: "cursor-1", hasNextPage: true }],
      pageParams: [undefined],
    });
    jest.mocked(getLikedStylePosts).mockResolvedValueOnce({
      nodes: [repeated, next],
      nextCursor: null,
      hasNextPage: false,
    });

    render(<WishStylesTab />, { wrapper: createWrapper(client) });

    await fireEvent.press(screen.getByText("더 보기"));
    await screen.findByText("#second");
    expect(screen.getAllByText("#first")).toHaveLength(1);
    await fireEvent.press(
      requiredAt(screen.getAllByLabelText("스타일 게시물 이미지"), 1),
    );
    expect(navigation.path).toBe("/style/style-2");
    await waitFor(() => expect(screen.queryByText("더 보기")).toBeNull());
  });

  it("keeps individual liked-style keys when the first item disappears", async () => {
    const client = createClient();
    const first = stylePost("style-1", "first");
    const second = stylePost("style-2", "second");
    const third = stylePost("style-3", "third");
    client.setQueryData(styleQueryKeys.likedPosts(), {
      pages: [
        {
          nodes: [first, second, third],
          nextCursor: null,
          hasNextPage: false,
        },
      ],
      pageParams: [undefined],
    });

    render(<WishStylesTab />, { wrapper: createWrapper(client) });

    await screen.findByText("#third");
    const initialRender = mockLegendListRenders.findLast(
      (rendered) => rendered.accessibilityLabel === "위시한 스타일 목록",
    );

    await act(async () => {
      client.setQueryData(styleQueryKeys.likedPosts(), {
        pages: [
          {
            nodes: [second, third],
            nextCursor: null,
            hasNextPage: false,
          },
        ],
        pageParams: [undefined],
      });
    });
    await waitFor(() => expect(screen.queryByText("#first")).toBeNull());
    const updatedRender = mockLegendListRenders.findLast(
      (rendered) => rendered.accessibilityLabel === "위시한 스타일 목록",
    );

    expect([initialRender, updatedRender]).toEqual([
      {
        accessibilityLabel: "위시한 스타일 목록",
        keys: ["style-1", "style-2", "style-3"],
        numColumns: 2,
      },
      {
        accessibilityLabel: "위시한 스타일 목록",
        keys: ["style-2", "style-3"],
        numColumns: 2,
      },
    ]);
    await fireEvent.press(
      requiredAt(screen.getAllByLabelText("스타일 게시물 이미지"), 0),
    );
    expect(navigation.path).toBe("/style/style-2");
  });

  it("allows only one liked-style request during rapid more presses", async () => {
    const client = createClient();
    const first = stylePost("style-1", "first");
    let resolveNextPage!: (page: StylePostConnection) => void;
    const nextPage = new Promise<StylePostConnection>((resolve) => {
      resolveNextPage = resolve;
    });
    client.setQueryData(styleQueryKeys.likedPosts(), {
      pages: [{ nodes: [first], nextCursor: "cursor-1", hasNextPage: true }],
      pageParams: [undefined],
    });
    jest.mocked(getLikedStylePosts).mockReturnValue(nextPage);

    render(<WishStylesTab />, { wrapper: createWrapper(client) });

    const moreButton = screen.getByRole("button", { name: "더 보기" });
    act(() => {
      fireEvent.press(moreButton);
      fireEvent.press(moreButton);
    });

    expect(getLikedStylePosts).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "더 보기" })).toBeDisabled(),
    );

    act(() => {
      resolveNextPage({ nodes: [], nextCursor: null, hasNextPage: false });
    });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    await waitFor(() => expect(screen.queryByText("더 보기")).toBeNull());
  });

  it("renders order rows and opens the selected order", async () => {
    const client = createClient();
    const orders: Order[] = [
      {
        orderId: "order-1",
        orderNumber: "20260828-1",
        status: "PAID",
        paymentStatus: "APPROVED",
        totalAmount: 8_000,
        items: [],
        createdAt: "2026-08-28T00:00:00.000Z",
      },
      {
        orderId: "order-2",
        orderNumber: "20260828-2",
        status: "COMPLETED",
        paymentStatus: "APPROVED",
        totalAmount: 12_000,
        items: [],
        createdAt: "2026-08-28T00:01:00.000Z",
      },
    ];
    client.setQueryData(orderQueryKeys.list(), orders);

    render(<OrdersScreen />, { wrapper: createWrapper(client) });

    expect(await screen.findByText("20260828-1")).toBeVisible();
    await fireEvent.press(screen.getByTestId("e2e.order.open.order-2"));
    expect(navigation.path).toBe("/order/order-2");
  });
});
