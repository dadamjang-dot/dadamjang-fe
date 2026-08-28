import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { authenticateAdmin, mockAdminApi } from "./support/mock-admin-api";

test.beforeEach(async ({ page }) => {
  await mockAdminApi(page);
});

test("login and protected routing", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("아이디")).toBeFocused();
  await page.getByLabel("아이디").fill("integration-admin");
  await page.getByLabel("비밀번호").fill("IntegrationAdmin123!");
  await authenticateAdmin(page);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
});

test("partner and product approval", async ({ page }) => {
  await authenticateAdmin(page);
  await page.goto("/partners");
  await page.getByRole("button", { name: "Pending Partner" }).click();
  await expect(
    page.getByRole("heading", { name: "파트너 상세" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "승인", exact: true }).click();
  const partnerDialog = page.getByRole("alertdialog");
  await partnerDialog
    .getByRole("button", { name: "승인", exact: true })
    .click();
  await expect(page.getByText("파트너를 승인했습니다.")).toBeVisible();

  await page.goto("/products");
  await page.getByRole("button", { name: "Pending Product" }).click();
  await expect(page.getByRole("heading", { name: "상품 상세" })).toBeVisible();
  await page.getByRole("button", { name: "반려", exact: true }).click();
  const productDialog = page.getByRole("alertdialog");
  await productDialog.getByLabel("반려 사유").fill("상세 설명을 보완해주세요.");
  await productDialog
    .getByRole("button", { name: "반려", exact: true })
    .click();
  await expect(page.getByText("상품을 반려했습니다.")).toBeVisible();
});

test("review dialogs discard stale input and mutation errors", async ({
  page,
}) => {
  await authenticateAdmin(page);
  let failProductReview = true;
  await page.route("**/api/graphql", async (route) => {
    const payload = route.request().postDataJSON() as { query: string };
    if (failProductReview && payload.query.includes("mutation ReviewProduct")) {
      failProductReview = false;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ errors: [{ message: "일시적인 검토 오류" }] }),
      });
      return;
    }
    await route.fallback();
  });

  await page.goto("/products");
  await page.getByRole("button", { name: "Pending Product" }).click();
  await page.getByRole("button", { name: "반려", exact: true }).click();
  let dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("반려 사유").fill("이전 상품 사유");
  await dialog.getByRole("button", { name: "반려", exact: true }).click();
  await expect(dialog.getByText("일시적인 검토 오류")).toBeVisible();
  await dialog.getByRole("button", { name: "취소" }).click();

  await page.getByRole("button", { name: "Pending Product" }).click();
  await page.getByRole("button", { name: "반려", exact: true }).click();
  dialog = page.getByRole("alertdialog");
  await expect(dialog.getByLabel("반려 사유")).toHaveValue("");
  await expect(dialog.getByText("일시적인 검토 오류")).toHaveCount(0);
  await dialog.getByRole("button", { name: "취소" }).click();

  await page.goto("/partners");
  await page.getByRole("button", { name: "Pending Partner" }).click();
  await page.getByRole("button", { name: "반려", exact: true }).click();
  dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "반려", exact: true }).click();
  await expect(
    dialog.getByText("반려 사유를 1~500자로 입력해주세요."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "취소" }).click();

  await page.getByRole("button", { name: "Pending Partner" }).click();
  await page.getByRole("button", { name: "반려", exact: true }).click();
  dialog = page.getByRole("alertdialog");
  await expect(
    dialog.getByText("반려 사유를 1~500자로 입력해주세요."),
  ).toHaveCount(0);
});

test("order transition uses server-provided next states", async ({ page }) => {
  await authenticateAdmin(page);
  await page.goto("/orders/order-1");
  await expect(
    page.getByRole("heading", { name: "DJ-ADMIN-001" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "처리 완료" })).toHaveCount(0);
  await page.getByRole("button", { name: "처리 중" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "상태 변경" })
    .click();
  await expect(page.getByText("주문 상태를 변경했습니다.")).toBeVisible();
  await expect(page.getByText("처리 중", { exact: true })).toBeVisible();
});

test("category edit, invite revoke, and audit metadata", async ({ page }) => {
  await authenticateAdmin(page);
  await page.goto("/categories");
  await page.getByLabel("이름").fill("액세서리");
  await page.getByLabel("Slug").fill("accessories");
  await page.getByRole("button", { name: "생성" }).click();
  await expect(page.getByText("카테고리를 생성했습니다.")).toBeVisible();
  await page.getByRole("button", { name: "액세서리" }).click();
  const categoryPanel = page.getByRole("dialog", { name: "카테고리 수정" });
  await categoryPanel.getByLabel("이름").fill("패션 액세서리");
  await categoryPanel.getByLabel("활성 카테고리").uncheck();
  await categoryPanel.getByRole("button", { name: "변경 저장" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "비활성화" })
    .click();
  await expect(page.getByText("카테고리를 수정했습니다.")).toBeVisible();

  await page.goto("/admins");
  await page.getByLabel("이메일").first().fill("new-admin@example.test");
  await page.getByRole("button", { name: "초대 발송" }).click();
  await expect(
    page.getByText("관리자 초대 메일을 발송했습니다."),
  ).toBeVisible();
  await page.getByRole("button", { name: "취소", exact: true }).first().click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "초대 취소" })
    .click();
  await expect(page.getByText("관리자 초대를 취소했습니다.")).toBeVisible();

  await page.goto("/audit-logs");
  await expect(page.getByRole("cell", { name: "파트너 승인" })).toBeVisible();
  await page.getByRole("button", { name: "partner-1" }).click();
  await expect(page.getByText(/previousStatus/)).toBeVisible();
});

test("invite acceptance creates an account that can log in", async ({
  page,
}) => {
  await page.goto("/invite/accept#token=e2e-token");
  await page.getByLabel("관리자 아이디").fill("accepted-admin");
  await page.getByLabel("비밀번호").fill("AcceptedAdmin123!");
  await page.getByRole("button", { name: "계정 만들기" }).click();
  await expect(page.getByText("관리자 계정이 생성되었습니다")).toBeVisible();
  await page.getByRole("link", { name: "로그인으로 이동" }).click();
  await page.getByLabel("아이디").fill("accepted-admin");
  await page.getByLabel("비밀번호").fill("AcceptedAdmin123!");
  await authenticateAdmin(page);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
