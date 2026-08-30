import { test } from "@playwright/test";
import type { Page } from "@playwright/test";

export const expectedConsoleErrors = new WeakMap<Page, RegExp[]>();
export const expectedRequestFailures = new WeakMap<Page, RegExp[]>();

export const setupPartnerTests = () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      {
        name: "partner_access_token",
        value: "partner-e2e-access-token",
        url: baseURL!,
      },
    ]);
  });

  test.beforeEach(async ({ page }) => {
    await page.route("**/_next/image?**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      }),
    );
    await page.route("https://images.test/**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      }),
    );
    page.on("pageerror", (error) => {
      throw error;
    });
    page.on("console", (message) => {
      const expected = expectedConsoleErrors.get(page) ?? [];
      if (
        message.type() === "error" &&
        !expected.some((pattern) => pattern.test(message.text()))
      )
        throw new Error(message.text());
    });
    page.on("requestfailed", (request) => {
      const failure = `${request.method()} ${request.url()}`;
      if (
        request.resourceType() === "fetch" &&
        new URL(request.url()).searchParams.has("_rsc") &&
        request.failure()?.errorText.includes("ERR_ABORTED")
      )
        return;
      if (
        !(expectedRequestFailures.get(page) ?? []).some((pattern) =>
          pattern.test(failure),
        )
      )
        throw new Error(failure);
    });
  });
};

type Handler = (
  variables: Record<string, unknown>,
) => unknown | Promise<unknown>;
export const routeGraphQl = async (
  page: Page,
  handlers: Record<string, Handler>,
) => {
  const calls: Array<{ query: string; variables: Record<string, unknown> }> =
    [];
  await page.route("**/api/graphql", async (route) => {
    const body = route.request().postDataJSON() as {
      query: string;
      variables?: Record<string, unknown>;
    };
    calls.push({ query: body.query, variables: body.variables ?? {} });
    const operationName = body.query.match(
      /\b(?:query|mutation)\s+([_A-Za-z][_0-9A-Za-z]*)/,
    )?.[1];
    const response = operationName
      ? await handlers[operationName]?.(body.variables ?? {})
      : undefined;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        response instanceof Error
          ? { errors: [{ message: response.message }] }
          : { data: response ?? {} },
      ),
    });
  });
  return calls;
};

export const partner = {
  myPartner: {
    partnerId: "partner-1",
    tradeName: "테스트 파트너",
    status: "APPROVED",
    brand: { brandId: "brand-1", name: "브랜드", slug: "brand" },
  },
};
export const session = {
  me: {
    userId: "user-1",
    userid: "partner",
    email: "p@test.dev",
    role: "PARTNER",
  },
};
export const sku = {
  skuId: "sku-1",
  code: "A",
  colorId: "black",
  sizeId: "m",
  optionName: "검정 M",
  price: 1000,
  stock: 2,
};
export const product = (approvalStatus = "DRAFT", status = "DRAFT") => ({
  productId: "product-1",
  partnerId: "partner-1",
  brandId: "brand-1",
  brand: partner.myPartner.brand,
  categoryId: "tops",
  title: "테스트 셔츠",
  description: "설명",
  imageUrls: ["https://images.test/product.png"],
  imageKeys: ["products/user-1/00000000-0000-4000-8000-000000000001.png"],
  status,
  approvalStatus,
  rejectionReason:
    approvalStatus === "REJECTED" ? "이미지를 확인해 주세요" : null,
  isOnSale: true,
  isExpressDelivery: false,
  skus: [sku],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});
export const productWithReorderableItems = () => ({
  ...product(),
  imageUrls: [
    "https://images.test/product-1.png",
    "https://images.test/product-2.png",
  ],
  imageKeys: [
    "products/user-1/00000000-0000-4000-8000-000000000001.png",
    "products/user-1/00000000-0000-4000-8000-000000000002.png",
  ],
  skus: [
    sku,
    { ...sku, skuId: "sku-2", code: "B", optionName: "흰색 L" },
    { ...sku, skuId: "sku-3", code: "C", optionName: "파랑 S" },
  ],
});
export const options = {
  catalogFilterOptions: {
    categories: [{ categoryId: "tops", name: "상의" }],
    colors: [{ colorId: "black", name: "검정" }],
    sizes: [{ sizeId: "m", name: "M" }],
  },
};
export const list = (nodes = [product()], hasNextPage = false) => ({
  myPartnerProducts: {
    nodes,
    nextCursor: hasNextPage ? "cursor-2" : null,
    hasNextPage,
    totalCount: nodes.length,
  },
});
export const protectedHandlers = (
  extra: Record<string, Handler> = {},
): Record<string, Handler> => ({
  PartnerMe: () => session,
  MyPartner: () => partner,
  ...extra,
});
