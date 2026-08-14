import { expect, Page, test } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    {
      name: "access_token",
      value: "partner-e2e-access-token",
      url: baseURL!,
    },
  ]);
});

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  page.on("console", (message) => {
    if (message.type() === "error") throw new Error(message.text());
  });
  page.on("requestfailed", (request) => {
    throw new Error(`${request.method()} ${request.url()}`);
  });
});

type Handler = (variables: Record<string, unknown>) => unknown;
const routeGraphQl = async (page: Page, handlers: Record<string, Handler>) => {
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
      ? handlers[operationName]?.(body.variables ?? {})
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

const partner = {
  myPartner: {
    partnerId: "partner-1",
    tradeName: "테스트 파트너",
    status: "APPROVED",
    brand: { brandId: "brand-1", name: "브랜드", slug: "brand" },
  },
};
const session = {
  me: {
    userId: "user-1",
    userid: "partner",
    email: "p@test.dev",
    role: "PARTNER",
  },
};
const product = (approvalStatus = "DRAFT", status = "DRAFT") => ({
  productId: "product-1",
  partnerId: "partner-1",
  brandId: "brand-1",
  brand: partner.myPartner.brand,
  categoryId: "tops",
  title: "테스트 셔츠",
  description: "설명",
  imageUrls: [],
  imageKeys: [],
  status,
  approvalStatus,
  rejectionReason:
    approvalStatus === "REJECTED" ? "이미지를 확인해 주세요" : null,
  isOnSale: true,
  isExpressDelivery: false,
  skus: [
    {
      skuId: "sku-1",
      code: "A",
      colorId: "black",
      sizeId: "m",
      optionName: "검정 M",
      price: 1000,
      stock: 2,
    },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});
const options = {
  catalogFilterOptions: {
    categories: [{ categoryId: "tops", name: "상의" }],
    colors: [{ colorId: "black", name: "검정" }],
    sizes: [{ sizeId: "m", name: "M" }],
  },
};
const list = (nodes = [product()], hasNextPage = false) => ({
  myPartnerProducts: {
    nodes,
    nextCursor: hasNextPage ? "cursor-2" : null,
    hasNextPage,
    totalCount: nodes.length,
  },
});
const protectedHandlers = (
  extra: Record<string, Handler> = {},
): Record<string, Handler> => ({
  PartnerMe: () => session,
  MyPartner: () => partner,
  ...extra,
});

test("login succeeds, reports API errors, and rejects non-partners", async ({
  page,
}) => {
  let role = "PARTNER";
  let signinError = false;
  await routeGraphQl(page, {
    Signin: () =>
      signinError
        ? new Error("아이디 또는 비밀번호가 올바르지 않습니다")
        : { signin: { role } },
    PartnerMe: () => ({ me: { ...session.me, role } }),
  });
  await page.goto("/login");
  await page.getByLabel("아이디").fill("partner");
  await page.getByLabel("비밀번호").fill("password");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/login");
  signinError = true;
  await page.getByLabel("아이디").fill("bad");
  await page.getByLabel("비밀번호").fill("bad");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(
    page.getByText("아이디 또는 비밀번호가 올바르지 않습니다", {
      exact: true,
    }),
  ).toBeVisible();

  signinError = false;
  role = "USER";
  await page.getByLabel("아이디").fill("customer");
  await page.getByLabel("비밀번호").fill("password");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(
    page.getByText("파트너 계정으로 로그인해 주세요.", { exact: true }),
  ).toBeVisible();
});

test("dashboard is protected by approval and linked-brand gates", async ({
  page,
}) => {
  let linked = false;
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      MyPartner: () => ({
        myPartner: {
          ...partner.myPartner,
          brand: linked ? partner.myPartner.brand : null,
        },
      }),
      PartnerDashboard: () => ({
        myPartnerDashboard: {
          draftCount: 1,
          pendingCount: 0,
          rejectedCount: 0,
          approvedCount: 0,
          publishedCount: 0,
        },
      }),
      PartnerProducts: () => list(),
    }),
  );
  await page.goto("/dashboard");
  await expect(page.locator(".gate")).toContainText("연결 브랜드");
  await expect(page.getByRole("heading", { name: "대시보드" })).toHaveCount(0);
  linked = true;
  await page.reload();
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "임시 저장" })).toBeVisible();
});

test("dashboard renders real metrics, rejection attention, and recent products", async ({
  page,
}) => {
  await routeGraphQl(
    page,
    protectedHandlers({
      PartnerDashboard: () => ({
        myPartnerDashboard: {
          draftCount: 2,
          pendingCount: 3,
          rejectedCount: 1,
          approvedCount: 4,
          publishedCount: 5,
        },
      }),
      PartnerProducts: (variables) =>
        (variables.filter as { state?: string }).state === "REJECTED"
          ? list([product("REJECTED")])
          : list([product("PENDING")]),
    }),
  );
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "상품 등록" })).toBeVisible();
  await expect(page.getByLabel("상품 상태 현황")).toContainText("5");
  await expect(page.getByText(/확인이 필요한 반려 상품/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "반려 사유 확인" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "상품 상태 안내" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "승인 대기" })).toBeVisible();
});

test("list submits query/state variables and navigates by cursor", async ({
  page,
}) => {
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProducts: (variables) => {
        const after = (variables.filter as { after?: string }).after;
        return list(
          [
            {
              ...product(after ? "REJECTED" : "DRAFT"),
              productId: after ? "product-2" : "product-1",
            },
          ],
          !after,
        );
      },
    }),
  );
  await page.goto("/products");
  await page.getByLabel("상품 검색").fill("셔츠");
  await page.getByLabel("카테고리").selectOption("tops");
  await page.getByLabel("상품 상태", { exact: true }).selectOption("REJECTED");
  await page.getByRole("button", { name: "검색" }).click();
  await expect
    .poll(
      () =>
        calls.filter((x) => x.query.includes("PartnerProducts")).at(-1)
          ?.variables,
    )
    .toEqual({
      filter: {
        query: "셔츠",
        state: "REJECTED",
        categoryId: "tops",
        first: 20,
      },
    });
  await page.getByRole("button", { name: "더 보기" }).click();
  await expect
    .poll(
      () =>
        calls.filter((x) => x.query.includes("PartnerProducts")).at(-1)
          ?.variables,
    )
    .toEqual({
      filter: {
        query: "셔츠",
        state: "REJECTED",
        categoryId: "tops",
        after: "cursor-2",
        first: 20,
      },
    });
});

test("create saves a draft and recovers its route when submit fails", async ({
  page,
}) => {
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      CreateProduct: () => ({ createPartnerProductDraft: product() }),
      SubmitProduct: () => new Error("심사를 요청하지 못했습니다"),
      PartnerProduct: () => ({ myPartnerProduct: product() }),
    }),
  );
  await page.goto("/products/new");
  await page.getByLabel("카테고리").selectOption("tops");
  await page.getByLabel("상품명").fill("새 셔츠");
  await page.getByLabel("SKU 1 코드").fill("NEW");
  await page.getByLabel("SKU 1 옵션명").fill("기본");
  await page.getByRole("button", { name: "심사 요청" }).click();
  await expect(page).toHaveURL(/products\/product-1\/edit/);
  await expect(
    page.getByText("심사를 요청하지 못했습니다", { exact: true }),
  ).toBeVisible();
  expect(calls.some((x) => x.query.includes("createPartnerProductDraft"))).toBe(
    true,
  );
  expect(
    calls.some((x) => x.query.includes("submitPartnerProductForReview")),
  ).toBe(true);
});

test("failed image upload preserves entered form values", async ({ page }) => {
  page.removeAllListeners("console");
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("status of 503"))
      throw new Error(message.text());
  });
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      ImageUpload: () => ({
        createProductImageUpload: {
          key: "products/user-1/image.png",
          uploadUrl: "http://127.0.0.1:3002/upload-fail",
          originalUrl: "http://images.test/image.png",
          imageUrl: "http://images.test/transformed.png",
        },
      }),
    }),
  );
  await page.route("**/upload-fail", (route) => route.fulfill({ status: 503 }));
  await page.goto("/products/new");
  await page.getByLabel("상품명").fill("보존할 상품명");
  await page.getByLabel("이미지 선택").setInputFiles({
    name: "failed.png",
    mimeType: "image/png",
    buffer: Buffer.from("image"),
  });
  await expect(
    page.getByText("이미지 업로드에 실패했습니다. (503)", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("상품명")).toHaveValue("보존할 상품명");
  await expect(page.getByAltText("상품 이미지 1")).toHaveCount(0);
});

test("canonical product route redirects to edit", async ({ page }) => {
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({ myPartnerProduct: product() }),
    }),
  );
  await page.goto("/products/product-1");
  await expect(page).toHaveURL(/products\/product-1\/edit$/);
  await expect(page.getByLabel("상품명")).toHaveValue("테스트 셔츠");
});

test("SKU reorder is preserved in the update payload", async ({ page }) => {
  const reordered = {
    ...product(),
    skus: [
      product().skus[0],
      {
        ...product().skus[0],
        skuId: "sku-2",
        code: "B",
        optionName: "흰색 L",
      },
    ],
  };
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({ myPartnerProduct: reordered }),
      UpdateProduct: () => ({ updatePartnerProductDraft: reordered }),
      PartnerProducts: () => list(),
    }),
  );
  await page.goto("/products/product-1/edit");
  await page.getByLabel("SKU 2 위로 이동").click();
  await page.getByRole("button", { name: "임시 저장" }).click();
  await expect
    .poll(() => {
      const variables = calls.find((call) =>
        call.query.includes("mutation UpdateProduct"),
      )?.variables;
      return (
        variables?.input as { skus?: Array<{ code: string }> } | undefined
      )?.skus?.map(({ code }) => code);
    })
    .toEqual(["B", "A"]);
});

test("unsaved edits block internal navigation until confirmed", async ({
  page,
}) => {
  await routeGraphQl(
    page,
    protectedHandlers({ CatalogOptions: () => options }),
  );
  await page.goto("/products/new");
  await page.getByLabel("상품명").fill("수정 중");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("저장하지 않은 변경사항");
    await dialog.dismiss();
  });
  await page.getByRole("link", { name: "상품 관리" }).click();
  await expect(page).toHaveURL(/products\/new$/);
});

test("review states control editability and rejected reason", async ({
  page,
}) => {
  let state = "REJECTED";
  await routeGraphQl(
    page,
    protectedHandlers({
      PartnerProduct: () => ({ myPartnerProduct: product(state) }),
      CatalogOptions: () => options,
    }),
  );
  await page.goto("/products/product-1");
  await expect(page.getByLabel("상품명")).toBeEnabled();
  await expect(
    page.locator(".error", { hasText: "이미지를 확인해 주세요" }),
  ).toBeVisible();
  for (state of ["PENDING", "APPROVED"]) {
    await page.reload();
    await expect(page.getByLabel("상품명")).toBeDisabled();
  }
  state = "APPROVED";
  await page.unrouteAll();
  await routeGraphQl(
    page,
    protectedHandlers({
      PartnerProduct: () => ({ myPartnerProduct: product(state, "PUBLISHED") }),
      CatalogOptions: () => options,
    }),
  );
  await page.reload();
  await expect(page.getByText("PUBLISHED", { exact: true })).toBeVisible();
  await expect(page.getByLabel("상품명")).toBeDisabled();
  await expect(page.getByRole("button", { name: "판매 게시" })).toHaveCount(0);
});

test("approved product publishes only after confirmation", async ({ page }) => {
  let published = false;
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      PartnerProduct: () => ({
        myPartnerProduct: product(
          "APPROVED",
          published ? "PUBLISHED" : "DRAFT",
        ),
      }),
      CatalogOptions: () => options,
      PublishProduct: () => {
        published = true;
        return { publishPartnerProduct: product("APPROVED", "PUBLISHED") };
      },
    }),
  );
  await page.goto("/products/product-1");
  await page.getByRole("button", { name: "판매 게시" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(calls.some((x) => x.query.includes("publishPartnerProduct"))).toBe(
    false,
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "게시", exact: true })
    .click();
  await expect(page.getByText("PUBLISHED", { exact: true })).toBeVisible();
});

test("logout submits the mutation and redirects", async ({ page }) => {
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      PartnerProducts: () => list(),
      Logout: () => ({ logout: true }),
    }),
  );
  await page.goto("/products");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/login/);
  expect(calls.some((x) => x.query.includes("mutation Logout"))).toBe(true);
});

test("responsive boundary blocks 767 and supports 768", async ({ page }) => {
  await routeGraphQl(
    page,
    protectedHandlers({ PartnerProducts: () => list() }),
  );
  await page.setViewportSize({ width: 767, height: 900 });
  await page.goto("/products");
  await expect(page.getByText("지원하지 않는 화면 크기입니다")).toBeVisible();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(page.getByRole("heading", { name: "상품 관리" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
