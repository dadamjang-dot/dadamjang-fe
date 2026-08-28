import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  list,
  options,
  partner,
  product,
  protectedHandlers,
  routeGraphQl,
  session,
  setupPartnerTests,
} from "./support/partner-test-support";

setupPartnerTests();

test("authenticated partner pages have no serious accessibility violations", async ({
  page,
}) => {
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerDashboard: () => ({
        myPartnerDashboard: {
          draftCount: 1,
          pendingCount: 1,
          rejectedCount: 1,
          approvedCount: 1,
          publishedCount: 1,
        },
      }),
      PartnerProducts: () => list(),
    }),
  );

  for (const [path, heading] of [
    ["/dashboard", "대시보드"],
    ["/products", "상품 관리"],
    ["/products/new", "상품 등록"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        ({ impact }) => impact === "serious" || impact === "critical",
      ),
    ).toEqual([]);
  }
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
  await expect(page.getByLabel("상품 상태 현황")).toContainText("승인 완료");
  await expect(page.getByLabel("상품 상태 현황")).toContainText("4");
  await expect(page.getByText(/확인이 필요한 반려 상품/)).toBeVisible();
  expect(
    await page.locator(".attention").evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      position: getComputedStyle(element).position,
    })),
  ).toMatchObject({ position: "static" });
  expect(
    await page
      .locator(".attention")
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThan(300);
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
  await expect(page.locator(".product-cell img").first()).toHaveAttribute(
    "src",
    /\/_next\/image\?url=https%3A%2F%2Fimages\.test%2Fproduct\.png/,
  );
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
