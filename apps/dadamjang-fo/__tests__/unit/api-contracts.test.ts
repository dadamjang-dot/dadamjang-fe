import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getDeviceId } from "@dadamjang/graphql-client";

import {
  completeIdentityVerification,
  completeKakaoLogin,
  signInFo,
  startIdentityVerification,
} from "@/features/auth/api";
import { checkoutCart, upsertCartItem } from "@/features/cart/api";
import { getProducts } from "@/features/catalog/api";
import { getOrder } from "@/features/order/api";
import {
  createStylePost,
  getStylePosts,
  uploadStylePostImage,
} from "@/features/style/api";
import { addWish } from "@/features/wish/api";

jest.mock("../../plugins/with-ios-build-settings.cjs", () => jest.fn());

const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "../../package.json"), "utf8"),
) as { dependencies?: Record<string, string> };
const appConfig = require("../../app.config.js")({ config: {} });

type CapturedRequest = {
  query: string;
  variables: Record<string, unknown> | undefined;
  headers: Record<string, string> | undefined;
};

const mockRequests: CapturedRequest[] = [];
const mockResponses: unknown[] = [];
const mockStoredTokens: unknown[] = [];
const mockFileSizes = new Map<string, number>();
const mockFileUpload = jest.fn();

jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    size: mockFileSizes.get(uri) ?? 0,
    upload: (url: string, options: unknown) =>
      mockFileUpload(uri, url, options),
  })),
}));

jest.mock("@dadamjang/graphql-client", () => ({
  getDeviceId: jest.fn(async () => "device-1"),
  graphqlRequest: jest.fn(
    (
      query: string,
      variables?: Record<string, unknown>,
      options?: { requestHeaders?: Record<string, string> },
    ) => {
      mockRequests.push({
        query,
        variables,
        headers: options?.requestHeaders,
      });
      return Promise.resolve(mockResponses.shift());
    },
  ),
  setAuthTokens: jest.fn(async (tokens: unknown) => {
    mockStoredTokens.push(tokens);
  }),
}));

describe("feature API contracts", () => {
  it("declares Expo notification dependencies and preserves the EAS project", () => {
    expect(packageJson.dependencies).toEqual(
      expect.objectContaining({
        "expo-constants": expect.any(String),
        "expo-notifications": expect.any(String),
      }),
    );
    expect(appConfig.plugins).toContain("expo-notifications");
    expect(appConfig.extra.eas.projectId).toBe(
      "095bcf9d-2bf8-4274-bb83-838d70c4f608",
    );
  });

  beforeEach(() => {
    mockRequests.length = 0;
    mockResponses.length = 0;
    mockStoredTokens.length = 0;
    mockFileSizes.clear();
    mockFileUpload.mockResolvedValue({ body: "", headers: {}, status: 200 });
    jest.mocked(getDeviceId).mockResolvedValue("device-1");
  });

  it("sends FO credentials and persists returned sign-in tokens", async () => {
    const tokens = {
      accessToken: "access",
      refreshToken: "refresh",
      role: "USER" as const,
    };
    mockResponses.push({ signinFo: tokens });

    await expect(signInFo("buyer@example.com", "password")).resolves.toEqual(
      tokens,
    );
    expect(mockRequests[0]?.query).toContain("mutation SigninFo");
    expect(mockRequests[0]?.variables).toEqual({
      input: { email: "buyer@example.com", password: "password" },
    });
    expect(mockRequests[0]?.headers).toEqual({ "x-device-id": "device-1" });
    expect(mockStoredTokens).toEqual([tokens]);
  });

  it("binds identity verification requests to the local device", async () => {
    const started = {
      sessionId: "session-1",
      launchUrl: "https://identity.example/start",
      expiresAt: "2026-08-13T00:00:00.000Z",
    };
    mockResponses.push({ startIdentityVerification: started });

    await expect(startIdentityVerification("SIGNUP", "TOSS")).resolves.toEqual(
      started,
    );
    expect(mockRequests[0]?.variables).toEqual({
      input: { purpose: "SIGNUP", provider: "TOSS" },
    });
    expect(mockRequests[0]?.headers).toEqual({ "x-device-id": "device-1" });
  });

  it("forwards one-time callback tokens through auth completion requests", async () => {
    const kakaoResult = {
      status: "SIGNED_IN" as const,
      tokenPayload: null,
      kakaoSignupToken: null,
      email: null,
      emailVerificationRequired: false,
    };
    const identityResult = { identityVerificationToken: "identity-proof" };
    mockResponses.push(
      { completeKakaoLogin: kakaoResult },
      { completeIdentityVerification: identityResult },
    );

    await expect(
      completeKakaoLogin("flow-1", "callback-token"),
    ).resolves.toEqual(kakaoResult);
    await expect(
      completeIdentityVerification("identity-session", "callback-token"),
    ).resolves.toEqual(identityResult);

    expect(mockRequests.map(({ variables }) => variables)).toEqual([
      { input: { callbackToken: "callback-token", flowId: "flow-1" } },
      { callbackToken: "callback-token", sessionId: "identity-session" },
    ]);
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
      getProducts({
        categoryIds: ["category-2", "category-1"],
        sort: "LOW_PRICE",
      }),
    ).resolves.toEqual(connection);
    expect(mockRequests[0]?.query).toContain("query Products");
    expect(mockRequests[0]?.variables).toEqual({
      filter: { categoryIds: ["category-2", "category-1"], sort: "LOW_PRICE" },
    });
  });

  it("maps cart, wish, checkout, and order identifiers to API inputs", async () => {
    const checkout = {
      orderId: "order-1",
      orderNumber: "DJ-1",
      status: "PAYMENT_PENDING" as const,
      paymentStatus: "PENDING" as const,
      totalAmount: 8_000,
    };
    const order = { orderId: "order-1" };
    mockResponses.push({}, {}, { checkoutCart: checkout }, { order });

    await upsertCartItem("sku-1", 3);
    await addWish("product-1");
    await expect(checkoutCart({ idempotencyKey: "checkout-1" })).resolves.toEqual(checkout);
    await expect(getOrder("order-1")).resolves.toEqual(order);

    expect(mockRequests.map(({ variables }) => variables)).toEqual([
      { input: { quantity: 3, skuId: "sku-1" } },
      { productId: "product-1" },
      { input: { idempotencyKey: "checkout-1" } },
      { orderId: "order-1" },
    ]);
  });

  it("sends style feed filters and structured style post input", async () => {
    const connection = { hasNextPage: true, nextCursor: "cursor-2", nodes: [] };
    const post = { stylePostId: "style-1" };
    mockResponses.push({ stylePosts: connection }, { createStylePost: post });

    await expect(
      getStylePosts({
        filter: { category: "CLOTHING", sort: "LATEST" },
        after: "cursor-1",
        first: 20,
      }),
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

  it("rejects a known oversized style image before opening it", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    await expect(
      uploadStylePostImage(
        {
          uri: "file:///oversized.jpg",
          fileName: "oversized.jpg",
          fileSize: 10 * 1024 * 1024 + 1,
          mimeType: "image/jpeg",
        },
        0,
      ),
    ).rejects.toThrow("10 MiB");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockRequests).toHaveLength(0);
  });

  it.each([
    ["unknown", null],
    ["underreported", 1],
  ])(
    "rejects an oversized style image with %s metadata before presigning",
    async (_, fileSize) => {
      mockFileSizes.set("file:///oversized.jpg", 10 * 1024 * 1024 + 1);
      const oversizedBlob = { size: 10 * 1024 * 1024 + 1 } as Blob;
      const fetchMock = jest.fn(async () => ({
        ok: true,
        blob: async () => oversizedBlob,
      }));
      global.fetch = fetchMock as unknown as typeof fetch;
      mockResponses.push({
        createStylePostImageUpload: {
          imageUrl: "https://cdn.example.com/style.jpg",
          key: "style-posts/user-1/style.jpg",
          uploadUrl: "https://upload.example.com/style.jpg",
        },
      });

      await expect(
        uploadStylePostImage(
          {
            uri: "file:///oversized.jpg",
            fileName: "oversized.jpg",
            fileSize,
            mimeType: "image/jpeg",
          },
          0,
        ),
      ).rejects.toThrow("10 MiB");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockFileUpload).not.toHaveBeenCalled();
      expect(mockRequests).toHaveLength(0);
    },
  );

  it("presigns and streams an accepted style image with its native file size", async () => {
    mockFileSizes.set("file:///style.jpg", 2048);
    const file = { size: 2048 } as Blob;
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, blob: async () => file })
      .mockResolvedValueOnce({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    mockResponses.push({
      createStylePostImageUpload: {
        imageUrl: "https://cdn.example.com/style.jpg",
        key: "style-posts/user-1/style.jpg",
        uploadUrl: "https://upload.example.com/style.jpg",
      },
    });

    await expect(
      uploadStylePostImage(
        {
          uri: "file:///style.jpg",
          fileName: "style.jpg",
          fileSize: 1,
          mimeType: "image/jpeg",
        },
        0,
      ),
    ).resolves.toBe("style-posts/user-1/style.jpg");

    expect(mockRequests[0]?.variables).toEqual({
      input: {
        contentType: "image/jpeg",
        fileSize: 2048,
        filename: "style.jpg",
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockFileUpload).toHaveBeenCalledWith(
      "file:///style.jpg",
      "https://upload.example.com/style.jpg",
      {
        headers: { "Content-Type": "image/jpeg" },
        httpMethod: "PUT",
        mimeType: "image/jpeg",
      },
    );
  });

  it("rejects image metadata outside the supported MIME allowlist", async () => {
    mockFileSizes.set("file:///style.svg", 1024);
    const fetchMock = jest.fn(async () => ({
      blob: async () => ({ size: 1024 }),
      ok: true,
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      uploadStylePostImage(
        {
          uri: "file:///style.svg",
          fileName: "style.svg",
          fileSize: 1024,
          mimeType: "image/svg+xml",
        },
        0,
      ),
    ).rejects.toThrow("지원하지 않는 이미지 형식");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockFileUpload).not.toHaveBeenCalled();
    expect(mockRequests).toHaveLength(0);
  });

  it.each([
    ["image/heic", "style.jpg"],
    ["image/heif", "style.jpg"],
    ["image/jpeg", "style.heic"],
    ["image/png", "style.heif"],
  ])(
    "rejects unsupported HEIC/HEIF metadata before presigning (%s, %s)",
    async (mimeType, fileName) => {
      mockFileSizes.set("file:///style-image", 1024);

      await expect(
        uploadStylePostImage(
          {
            uri: "file:///style-image",
            fileName,
            fileSize: 1024,
            mimeType,
          },
          0,
        ),
      ).rejects.toThrow("지원하지 않는 이미지 형식");

      expect(mockFileUpload).not.toHaveBeenCalled();
      expect(mockRequests).toHaveLength(0);
    },
  );

  it.each([
    ["image/jpeg", "camera-output.jpeg", "camera-output.jpg"],
    ["image/png", "camera-output.bin", "camera-output.png"],
    ["image/webp", null, "style-post-2.webp"],
  ])(
    "aligns a %s upload filename, request MIME, and streamed MIME",
    async (mimeType, fileName, expectedFilename) => {
      const uri = `file:///style-${mimeType}`;
      mockFileSizes.set(uri, 2048);
      mockResponses.push({
        createStylePostImageUpload: {
          imageUrl: "https://cdn.example.com/style",
          key: "style-posts/user-1/style",
          uploadUrl: "https://upload.example.com/style",
        },
      });

      await uploadStylePostImage(
        { uri, fileName, fileSize: 2048, mimeType },
        2,
      );

      expect(mockRequests[0]?.variables).toEqual({
        input: {
          contentType: mimeType,
          fileSize: 2048,
          filename: expectedFilename,
        },
      });
      expect(mockFileUpload).toHaveBeenCalledWith(
        uri,
        "https://upload.example.com/style",
        {
          headers: { "Content-Type": mimeType },
          httpMethod: "PUT",
          mimeType,
        },
      );
    },
  );
});
