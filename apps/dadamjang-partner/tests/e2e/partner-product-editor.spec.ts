import { expect, test } from "@playwright/test";

import {
  list,
  options,
  product,
  productWithReorderableItems,
  protectedHandlers,
  routeGraphQl,
  setupPartnerTests,
  sku,
} from "./support/partner-test-support";

setupPartnerTests();

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
  const rail = page.getByLabel("상품 미리보기 및 작업");
  expect(
    await rail.evaluate((element) => getComputedStyle(element).position),
  ).toBe(page.viewportSize()!.width > 1024 ? "sticky" : "static");
  expect(
    await rail.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThan(page.viewportSize()!.height / 2);
});

test("failed product detail can be retried", async ({ page }) => {
  let attempts = 0;
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => {
        attempts += 1;
        return attempts <= 2
          ? new Error("상품 조회 실패")
          : { myPartnerProduct: product() };
      },
    }),
  );

  await page.goto("/products/product-1/edit");
  await expect(
    page.getByRole("alert").getByText("상품을 불러오지 못했습니다."),
  ).toBeVisible();
  await page.getByRole("button", { name: "다시 시도" }).click();

  await expect(page.getByLabel("상품명")).toHaveValue("테스트 셔츠");
});

test("SKU reorder is preserved in the update payload", async ({ page }) => {
  const reordered = {
    ...product(),
    skus: [
      sku,
      {
        ...sku,
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

test("saving invalidates product list, dashboard, and detail caches", async ({
  page,
}) => {
  let savedProduct = product();
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerDashboard: () => ({
        myPartnerDashboard: {
          draftCount: 1,
          pendingCount: 0,
          rejectedCount: 0,
          approvedCount: 0,
          publishedCount: 0,
        },
      }),
      PartnerProducts: () => list([savedProduct]),
      PartnerProduct: () => ({ myPartnerProduct: savedProduct }),
      UpdateProduct: (variables) => {
        const input = variables.input as { title: string };
        savedProduct = { ...savedProduct, title: input.title };
        return { updatePartnerProductDraft: savedProduct };
      },
    }),
  );

  await page.goto("/products");
  await expect(page.getByText("테스트 셔츠", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "수정", exact: true }).click();
  await expect(page.getByLabel("상품명")).toHaveValue("테스트 셔츠");
  await page.getByLabel("상품명").fill("수정된 셔츠");
  await page.getByRole("button", { name: "임시 저장" }).click();

  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByText("수정된 셔츠", { exact: true })).toBeVisible();
  expect(
    calls.filter((call) => call.query.includes("query PartnerProducts")),
  ).toHaveLength(2);
  expect(
    calls.filter((call) => call.query.includes("query PartnerDashboard")),
  ).toHaveLength(2);

  await page.getByRole("link", { name: "수정", exact: true }).click();
  await expect(page.getByLabel("상품명")).toHaveValue("수정된 셔츠");
  expect(
    calls.filter((call) => call.query.includes("query PartnerProduct(")),
  ).toHaveLength(2);
});

test("repeated stale SKU delete and move keep sibling order", async ({
  page,
}) => {
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({
        myPartnerProduct: productWithReorderableItems(),
      }),
    }),
  );
  await page.goto("/products/product-1/edit");
  await page
    .locator(".sku")
    .nth(1)
    .evaluate((row) => {
      const buttons = Array.from(row.querySelectorAll("button"));
      const up = buttons.find(
        (button) => button.textContent?.trim() === "위로",
      );
      const remove = buttons.find(
        (button) => button.textContent?.trim() === "행 삭제",
      );
      if (!up || !remove) throw new Error("Expected SKU row controls");
      remove.click();
      remove.click();
      up.click();
    });

  await expect(page.locator(".sku")).toHaveCount(2);
  await expect(page.getByLabel("SKU 1 코드")).toHaveValue("A");
  await expect(page.getByLabel("SKU 2 코드")).toHaveValue("C");
});

test("stale SKU field events after deletion do not mutate the successor", async ({
  page,
}) => {
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({
        myPartnerProduct: productWithReorderableItems(),
      }),
    }),
  );
  await page.goto("/products/product-1/edit");
  await page
    .locator(".sku")
    .nth(1)
    .evaluate((row) => {
      const code = row.querySelector<HTMLInputElement>(
        'input[aria-label="SKU 2 코드"]',
      );
      const optionName = row.querySelector<HTMLInputElement>(
        'input[aria-label="SKU 2 옵션명"]',
      );
      const color = row.querySelector<HTMLSelectElement>(
        'select[aria-label="SKU 2 색상"]',
      );
      const size = row.querySelector<HTMLSelectElement>(
        'select[aria-label="SKU 2 사이즈"]',
      );
      const price = row.querySelector<HTMLInputElement>(
        'input[aria-label="SKU 2 가격"]',
      );
      const stock = row.querySelector<HTMLInputElement>(
        'input[aria-label="SKU 2 재고"]',
      );
      const remove = Array.from(row.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === "행 삭제",
      );
      if (
        !code ||
        !optionName ||
        !color ||
        !size ||
        !price ||
        !stock ||
        !remove
      )
        throw new Error("Expected SKU row fields and removal control");
      const dispatchValue = (
        element: HTMLInputElement | HTMLSelectElement,
        value: string,
        eventType: "input" | "change",
      ) => {
        const prototype =
          element instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        if (!setter) throw new Error("Expected a native value setter");
        setter.call(element, value);
        element.dispatchEvent(new Event(eventType, { bubbles: true }));
      };

      remove.click();
      dispatchValue(code, "STALE-B", "input");
      dispatchValue(optionName, "오래된 B", "input");
      dispatchValue(color, "", "change");
      dispatchValue(size, "", "change");
      dispatchValue(price, "9000", "input");
      dispatchValue(stock, "99", "input");
    });

  await expect(page.locator(".sku")).toHaveCount(2);
  await expect(page.getByLabel("SKU 2 코드")).toHaveValue("C");
  await expect(page.getByLabel("SKU 2 옵션명")).toHaveValue("파랑 S");
  await expect(page.getByLabel("SKU 2 색상")).toHaveValue("black");
  await expect(page.getByLabel("SKU 2 사이즈")).toHaveValue("m");
  await expect(page.getByLabel("SKU 2 가격")).toHaveValue("1000");
  await expect(page.getByLabel("SKU 2 재고")).toHaveValue("2");
});

test("repeated stale SKU move only moves the captured SKU", async ({
  page,
}) => {
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({
        myPartnerProduct: productWithReorderableItems(),
      }),
    }),
  );
  await page.goto("/products/product-1/edit");
  await page.getByLabel("SKU 2 아래로 이동").evaluate((button) => {
    if (!(button instanceof HTMLButtonElement))
      throw new Error("Expected button");
    button.click();
    button.click();
  });

  await expect(page.getByLabel("SKU 1 코드")).toHaveValue("A");
  await expect(page.getByLabel("SKU 2 코드")).toHaveValue("C");
  await expect(page.getByLabel("SKU 3 코드")).toHaveValue("B");
});

test("repeated stale image delete keeps the sibling image", async ({
  page,
}) => {
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({
        myPartnerProduct: productWithReorderableItems(),
      }),
    }),
  );
  await page.goto("/products/product-1/edit");
  await page
    .locator(".images article")
    .first()
    .getByRole("button", { name: "삭제", exact: true })
    .evaluate((button) => {
      if (!(button instanceof HTMLButtonElement))
        throw new Error("Expected button");
      button.click();
      button.click();
    });

  await expect(page.locator(".images article")).toHaveCount(1);
  await expect(page.getByAltText("상품 이미지 1")).toHaveAttribute(
    "src",
    /\/_next\/image\?url=https%3A%2F%2Fimages\.test%2Fproduct-2\.png/,
  );
});

test("unsaved edits block internal navigation until confirmed", async ({
  page,
}) => {
  await routeGraphQl(
    page,
    protectedHandlers({ CatalogOptions: () => options }),
  );
  await page.goto("/products/new");
  await page.getByRole("button", { name: "SKU 추가" }).click();
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("저장하지 않은 변경사항");
    await dialog.dismiss();
  });
  await page.getByRole("link", { name: "상품 관리" }).click();
  await expect(page).toHaveURL(/products\/new$/);
});

test("confirmed internal navigation consumes the dirty history guard", async ({
  page,
}) => {
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProducts: () => list([]),
    }),
  );
  await page.goto("/products");
  await page.getByRole("link", { name: "상품 등록" }).click();
  await page.getByRole("button", { name: "SKU 추가" }).click();
  page.once("dialog", (dialog) => dialog.accept());

  await page.getByRole("link", { name: "상품 관리" }).click();
  await expect(page).toHaveURL(/\/products$/);

  await page.goBack();
  await expect(page).toHaveURL(/products\/new$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/products$/);
});

test("unsaved edits block browser Back and recover after cancellation", async ({
  page,
}) => {
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerDashboard: () => ({
        myPartnerDashboard: {
          draftCount: 0,
          pendingCount: 0,
          rejectedCount: 0,
          approvedCount: 0,
          publishedCount: 0,
        },
      }),
      PartnerProducts: () => list([]),
    }),
  );
  await page.goto("/products");
  await page.getByRole("link", { name: "상품 등록" }).click();
  await page.getByRole("button", { name: "SKU 추가" }).click();
  const messages: string[] = [];
  page.once("dialog", async (dialog) => {
    messages.push(dialog.message());
    await dialog.dismiss();
  });

  await page.evaluate(() => history.back());

  await expect(page).toHaveURL(/products\/new$/);
  expect(messages).toEqual(["저장하지 않은 변경사항이 있습니다. 이동할까요?"]);

  page.once("dialog", (dialog) => dialog.accept());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/products$/);
});

test("publish dialog owns its accessible description", async ({ page }) => {
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({
        myPartnerProduct: product("APPROVED"),
      }),
    }),
  );
  await page.goto("/products/product-1/edit");
  await page.getByRole("button", { name: "판매 게시" }).click();

  await expect(page.getByRole("dialog")).toHaveAttribute(
    "aria-describedby",
    "publish-description",
  );
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
  await page.unroute("**/api/graphql");
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

test("published product edits only price and stock with the inventory mutation", async ({
  page,
}) => {
  const published = {
    ...productWithReorderableItems(),
    approvalStatus: "APPROVED",
    status: "PUBLISHED",
  };
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({ myPartnerProduct: published }),
      UpdatePublishedProductSkus: () => ({
        updatePublishedProductSkus: published,
      }),
      PartnerProducts: () => list([published]),
    }),
  );

  await page.goto("/products/product-1/edit");

  await expect(page.getByLabel("카테고리")).toBeDisabled();
  await expect(page.getByLabel("상품명")).toBeDisabled();
  await expect(page.getByLabel("설명")).toBeDisabled();
  await expect(page.getByLabel("이미지 선택")).toBeDisabled();
  const imageDeletes = page.getByRole("button", {
    name: "삭제",
    exact: true,
  });
  await expect(imageDeletes).toHaveCount(2);
  await expect(imageDeletes.first()).toBeDisabled();
  await expect(imageDeletes.last()).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "뒤로", exact: true }).first(),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "앞으로", exact: true }).last(),
  ).toBeDisabled();
  await expect(page.getByLabel("SKU 1 코드")).toBeDisabled();
  await expect(page.getByLabel("SKU 1 옵션명")).toBeDisabled();
  await expect(page.getByLabel("SKU 1 색상")).toBeDisabled();
  await expect(page.getByLabel("SKU 1 사이즈")).toBeDisabled();
  await expect(page.getByLabel("SKU 1 위로 이동")).toBeDisabled();
  await expect(page.getByLabel("SKU 1 아래로 이동")).toBeDisabled();
  const skuDeletes = page.getByRole("button", { name: "행 삭제" });
  await expect(skuDeletes).toHaveCount(3);
  for (const skuDelete of await skuDeletes.all())
    await expect(skuDelete).toBeDisabled();
  await expect(page.getByRole("button", { name: "SKU 추가" })).toBeDisabled();
  await expect(page.getByLabel("판매 상품")).toBeDisabled();
  await expect(page.getByLabel("빠른 배송")).toBeDisabled();
  for (const index of [1, 2, 3]) {
    await expect(page.getByLabel(`SKU ${index} 가격`)).toBeEnabled();
    await expect(page.getByLabel(`SKU ${index} 재고`)).toBeEnabled();
  }
  await expect(page.getByRole("button", { name: "임시 저장" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "심사 요청" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "판매 게시" })).toHaveCount(0);

  await page.getByLabel("SKU 1 가격").fill("900");
  await page.getByLabel("SKU 1 재고").fill("7");
  await page.getByRole("button", { name: "저장", exact: true }).click();

  await expect
    .poll(() => calls.filter(({ query }) => query.includes("mutation ")))
    .toHaveLength(1);
  const mutation = calls.find(({ query }) => query.includes("mutation "));
  expect(mutation?.query).toContain("mutation UpdatePublishedProductSkus");
  expect(mutation?.query).toContain(
    "updatePublishedProductSkus(input: $input)",
  );
  expect(mutation?.query).not.toContain("updatePartnerProductDraft");
  expect(mutation?.variables).toEqual({
    input: {
      productId: "product-1",
      skus: [
        { skuId: "sku-1", price: 900, stock: 7 },
        { skuId: "sku-2", price: 1000, stock: 2 },
        { skuId: "sku-3", price: 1000, stock: 2 },
      ],
    },
  });
});

test("published product rejects a missing SKU id", async ({ page }) => {
  const invalid = {
    ...product("APPROVED", "PUBLISHED"),
    skus: [{ ...sku, skuId: "" }],
  };
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({ myPartnerProduct: invalid }),
    }),
  );

  await page.goto("/products/product-1/edit");
  await page.getByRole("button", { name: "저장", exact: true }).click();

  await expect(page.locator(".error[role=alert]")).toContainText(
    "게시 상품 SKU 정보가 올바르지 않습니다.",
  );
  expect(calls.some(({ query }) => query.includes("mutation "))).toBe(false);
});

test("published product rejects non-integer inventory before the API call", async ({
  page,
}) => {
  const published = product("APPROVED", "PUBLISHED");
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({ myPartnerProduct: published }),
    }),
  );

  await page.goto("/products/product-1/edit");
  await page.getByLabel("SKU 1 가격").fill("1.5");
  await page.locator("form").evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected form");
    form.noValidate = true;
  });
  await page.getByRole("button", { name: "저장", exact: true }).click();

  await expect(page.locator(".error[role=alert]")).toContainText(
    "가격/재고는 0 이상의 정수로 입력하세요.",
  );

  await page.reload();
  await page.getByLabel("SKU 1 재고").fill("-1");
  await page.locator("form").evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected form");
    form.noValidate = true;
  });
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.locator(".error[role=alert]")).toContainText(
    "가격/재고는 0 이상의 정수로 입력하세요.",
  );
  expect(calls.some(({ query }) => query.includes("mutation "))).toBe(false);
});

test("rejected draft keeps the full draft update flow", async ({ page }) => {
  const rejected = product("REJECTED");
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({ myPartnerProduct: rejected }),
      UpdateProduct: () => ({ updatePartnerProductDraft: rejected }),
      PartnerProducts: () => list([rejected]),
    }),
  );

  await page.goto("/products/product-1/edit");
  await expect(page.getByLabel("카테고리")).toBeEnabled();
  await expect(page.getByLabel("상품명")).toBeEnabled();
  await expect(page.getByLabel("설명")).toBeEnabled();
  await expect(page.getByLabel("이미지 선택")).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "삭제", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("SKU 1 코드")).toBeEnabled();
  await expect(page.getByLabel("SKU 1 옵션명")).toBeEnabled();
  await expect(page.getByLabel("SKU 1 색상")).toBeEnabled();
  await expect(page.getByLabel("SKU 1 사이즈")).toBeEnabled();
  await expect(page.getByLabel("SKU 1 가격")).toBeEnabled();
  await expect(page.getByLabel("SKU 1 재고")).toBeEnabled();
  await expect(page.getByRole("button", { name: "행 삭제" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "SKU 추가" })).toBeEnabled();
  await expect(page.getByLabel("판매 상품")).toBeEnabled();
  await expect(page.getByLabel("빠른 배송")).toBeEnabled();

  await page.getByRole("button", { name: "임시 저장" }).click();

  await expect
    .poll(() => calls.filter(({ query }) => query.includes("mutation ")))
    .toHaveLength(1);
  const mutation = calls.find(({ query }) => query.includes("mutation "));
  expect(mutation?.query).toContain("mutation UpdateProduct");
  expect(mutation?.query).not.toContain("updatePublishedProductSkus");
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
  const publish = page.getByRole("button", { name: "판매 게시" });
  await publish.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "취소" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(publish).toBeFocused();
  await publish.click();
  expect(calls.some((x) => x.query.includes("publishPartnerProduct"))).toBe(
    false,
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "게시", exact: true })
    .click();
  await expect(page.getByText("PUBLISHED", { exact: true })).toBeVisible();
});
