import { getDeviceId } from "@dadamjang/graphql-client";

import { signIn } from "@/features/auth/api";
import { checkoutCart, upsertCartItem } from "@/features/cart/api";
import { getProducts } from "@/features/catalog/api";
import { getOrder } from "@/features/order/api";
import { createStylePost, getStylePosts } from "@/features/style/api";
import { addWish } from "@/features/wish/api";

type CapturedRequest = {
  query: string;
  variables: Record<string, unknown> | undefined;
  headers: Record<string, string> | undefined;
};

const mockRequests: CapturedRequest[] = [];
const mockResponses: unknown[] = [];
const mockStoredTokens: unknown[] = [];

jest.mock("@dadamjang/graphql-client", () => ({
  getDeviceId: jest.fn(async () => "device-1"),
  graphqlRequest: jest.fn(
    (
      query: string,
      variables?: Record<string, unknown>,
      headers?: Record<string, string>,
    ) => {
      mockRequests.push({ query, variables, headers });
      return Promise.resolve(mockResponses.shift());
    },
  ),
  setAuthTokens: jest.fn(async (tokens: unknown) => {
    mockStoredTokens.push(tokens);
  }),
}));

describe("feature API contracts", () => {
  beforeEach(() => {
    mockRequests.length = 0;
    mockResponses.length = 0;
    mockStoredTokens.length = 0;
    jest.mocked(getDeviceId).mockResolvedValue("device-1");
  });

  it("sends FO credentials and persists returned sign-in tokens", async () => {
    const tokens = {
      accessToken: "access",
      refreshToken: "refresh",
      role: "USER" as const,
    };
    mockResponses.push({ signin: tokens });

    await expect(signIn("buyer", "password")).resolves.toEqual(tokens);
    expect(mockRequests[0]?.query).toContain("mutation Signin");
    expect(mockRequests[0]?.variables).toEqual({
      input: { password: "password", portal: "Fo", userid: "buyer" },
    });
    expect(mockRequests[0]?.headers).toEqual({ "x-device-id": "device-1" });
    expect(mockStoredTokens).toEqual([tokens]);
  });

  it("passes catalog filters without changing the public GraphQL shape", async () => {
    const connection = {
      hasNextPage: false,
      nextCursor: null,
      nodes: [],
      totalCount: 0,
    };
    mockResponses.push({ products: connection });

    await expect(
      getProducts({ categoryIds: ["category-2", "category-1"], sort: "LOW_PRICE" }),
    ).resolves.toEqual(connection);
    expect(mockRequests[0]?.query).toContain("query Products");
    expect(mockRequests[0]?.variables).toEqual({
      filter: { categoryIds: ["category-2", "category-1"], sort: "LOW_PRICE" },
    });
  });

  it("maps cart, wish, checkout, and order identifiers to API inputs", async () => {
    const checkout = { orderId: "order-1" };
    const order = { orderId: "order-1" };
    mockResponses.push({}, {}, { checkoutCart: checkout }, { order });

    await upsertCartItem("sku-1", 3);
    await addWish("product-1");
    await expect(
      checkoutCart({ idempotencyKey: "checkout-1", forcePaymentFailure: true }),
    ).resolves.toEqual(checkout);
    await expect(getOrder("order-1")).resolves.toEqual(order);

    expect(mockRequests.map(({ variables }) => variables)).toEqual([
      { input: { quantity: 3, skuId: "sku-1" } },
      { productId: "product-1" },
      { input: { forcePaymentFailure: true, idempotencyKey: "checkout-1" } },
      { orderId: "order-1" },
    ]);
  });

  it("sends style feed filters and structured style post input", async () => {
    const connection = { hasNextPage: true, nextCursor: "cursor-2", nodes: [] };
    const post = { stylePostId: "style-1" };
    mockResponses.push({ stylePosts: connection }, { createStylePost: post });

    await expect(
      getStylePosts({ filter: { category: "CLOTHING", sort: "LATEST" }, after: "cursor-1", first: 20 }),
    ).resolves.toEqual(connection);
    await expect(
      createStylePost({
        category: "CLOTHING",
        productIds: ["product-1"],
        imageKeys: ["style-posts/user-1/image.jpg"],
        content: "오늘의 스타일",
        hashtags: ["daily"],
        brandTagIds: ["brand-1"],
        idempotencyKey: "request-1",
      }),
    ).resolves.toEqual(post);

    expect(mockRequests[0]?.query).toContain("query StylePosts");
    expect(mockRequests[0]?.variables).toEqual({
      filter: { category: "CLOTHING", sort: "LATEST" },
      after: "cursor-1",
      first: 20,
    });
    expect(mockRequests[1]?.variables).toEqual({
      input: {
        brandTagIds: ["brand-1"],
        category: "CLOTHING",
        content: "오늘의 스타일",
        hashtags: ["daily"],
        idempotencyKey: "request-1",
        imageKeys: ["style-posts/user-1/image.jpg"],
        productIds: ["product-1"],
      },
    });
  });
});
