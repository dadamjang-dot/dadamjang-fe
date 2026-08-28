import { expect, test } from "@playwright/test";

import {
  expectedConsoleErrors,
  expectedRequestFailures,
  list,
  options,
  product,
  protectedHandlers,
  routeGraphQl,
  setupPartnerTests,
} from "./support/partner-test-support";

setupPartnerTests();

test("create saves a draft and recovers its route when submit fails", async ({
  page,
}) => {
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      ImageUpload: () => ({
        createProductImageUpload: {
          key: "products/user-1/00000000-0000-4000-8000-000000000002.png",
          uploadUrl: "http://127.0.0.1:3002/upload-create",
          originalUrl: "https://images.test/create.png",
          imageUrl: "https://images.test/create-transformed.png",
        },
      }),
      CreateProduct: () => ({ createPartnerProductDraft: product() }),
      SubmitProduct: () => new Error("심사를 요청하지 못했습니다"),
      PartnerProduct: () => ({ myPartnerProduct: product() }),
    }),
  );
  await page.route("**/upload-create", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.goto("/products/new");
  await page.getByLabel("카테고리").selectOption("tops");
  await page.getByLabel("상품명").fill("새 셔츠");
  await page.getByLabel("설명").fill("새 상품 설명");
  await page.getByLabel("이미지 선택").setInputFiles({
    name: "create.png",
    mimeType: "image/png",
    buffer: Buffer.from("image"),
  });
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
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

test("create requires at least one completed image", async ({ page }) => {
  const calls = await routeGraphQl(
    page,
    protectedHandlers({ CatalogOptions: () => options }),
  );
  await page.goto("/products/new");
  await page.getByLabel("카테고리").selectOption("tops");
  await page.getByLabel("상품명").fill("새 셔츠");
  await page.getByLabel("설명").fill("새 상품 설명");
  await page.getByLabel("SKU 1 코드").fill("NEW");
  await page.getByLabel("SKU 1 옵션명").fill("기본");
  await page.getByRole("button", { name: "임시 저장" }).click();

  await expect(
    page.getByText("상품 이미지를 1장 이상 등록해 주세요.", { exact: true }),
  ).toBeVisible();
  expect(
    calls.some((call) => call.query.includes("createPartnerProductDraft")),
  ).toBe(false);
});

test("missing existing image URL blocks save without rendering an empty src", async ({
  page,
}) => {
  const unavailable = { ...product(), imageUrls: [] };
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({ myPartnerProduct: unavailable }),
    }),
  );
  await page.goto("/products/product-1/edit");
  await expect(
    page.getByRole("img", {
      name: "상품 이미지 1을 불러올 수 없습니다.",
    }),
  ).toBeVisible();
  await expect(page.locator('img[src=""]')).toHaveCount(0);
  await page.getByRole("button", { name: "임시 저장" }).click();

  await expect(
    page.getByText("불러오지 못한 상품 이미지를 다시 등록해 주세요.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    calls.some((call) => call.query.includes("updatePartnerProductDraft")),
  ).toBe(false);
});

test("failed image upload preserves entered form values", async ({ page }) => {
  expectedConsoleErrors.set(page, [/status of 503/]);
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

test("multi-image uploads are bounded, ordered, and keep successful files", async ({
  page,
}) => {
  expectedConsoleErrors.set(page, [/status of 503/]);
  const started: string[] = [];
  const releases = new Map<string, () => void>();
  let activeReservations = 0;
  let maxActiveReservations = 0;
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({ myPartnerProduct: product() }),
      ImageUpload: async (variables) => {
        const filename = (variables.input as { filename: string }).filename;
        started.push(filename);
        activeReservations += 1;
        maxActiveReservations = Math.max(
          maxActiveReservations,
          activeReservations,
        );
        await new Promise<void>((resolve) => releases.set(filename, resolve));
        activeReservations -= 1;
        return {
          createProductImageUpload: {
            key: `products/user-1/${filename}`,
            uploadUrl: `http://127.0.0.1:3002/upload-${filename}`,
            originalUrl: `https://images.test/${filename}`,
            imageUrl: `https://images.test/${filename}`,
          },
        };
      },
      UpdateProduct: (variables) => {
        const imageKeys = (variables.input as { imageKeys: string[] })
          .imageKeys;
        return {
          updatePartnerProductDraft: {
            ...product(),
            imageKeys,
            imageUrls: imageKeys.map(
              (key) => `https://images.test/${key.split("/").at(-1)}`,
            ),
          },
        };
      },
      PartnerProducts: () => list(),
    }),
  );
  await page.route("**/upload-*", (route) =>
    route.request().url().endsWith("upload-four.png")
      ? route.fulfill({ status: 503 })
      : route.fulfill({ status: 204 }),
  );
  await page.goto("/products/product-1/edit");

  await page.getByLabel("이미지 선택").setInputFiles(
    ["one", "two", "three", "four", "five"].map((name) => ({
      name: `${name}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(name),
    })),
  );

  await expect.poll(() => started).toEqual(["one.png", "two.png", "three.png"]);
  releases.get("three.png")?.();
  await expect.poll(() => started).toContain("four.png");
  releases.get("two.png")?.();
  await expect.poll(() => started).toContain("five.png");
  for (const name of ["five.png", "four.png", "one.png"])
    releases.get(name)?.();

  await expect(page.locator(".images article")).toHaveCount(5);
  await expect(
    page.getByText("이미지 업로드에 실패했습니다. (503)", { exact: true }),
  ).toBeVisible();
  expect(maxActiveReservations).toBe(3);

  await page.getByRole("button", { name: "임시 저장" }).click();
  await expect
    .poll(
      () =>
        calls.find((call) => call.query.includes("mutation UpdateProduct"))
          ?.variables,
    )
    .toMatchObject({
      input: {
        imageKeys: [
          "products/user-1/00000000-0000-4000-8000-000000000001.png",
          "products/user-1/one.png",
          "products/user-1/two.png",
          "products/user-1/three.png",
          "products/user-1/five.png",
        ],
      },
    });
});

test("overlapping image selections share one upload concurrency bound", async ({
  page,
}) => {
  const started: string[] = [];
  let active = 0;
  let maxActive = 0;
  let releaseReservations = () => {};
  const reservationsReleased = new Promise<void>((resolve) => {
    releaseReservations = resolve;
  });
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      ImageUpload: async (variables) => {
        const filename = (variables.input as { filename: string }).filename;
        started.push(filename);
        active += 1;
        maxActive = Math.max(maxActive, active);
        await reservationsReleased;
        active -= 1;
        return {
          createProductImageUpload: {
            key: `products/user-1/${filename}`,
            uploadUrl: `http://127.0.0.1:3002/upload-overlap-${filename}`,
            originalUrl: `https://images.test/${filename}`,
            imageUrl: `https://images.test/${filename}`,
          },
        };
      },
    }),
  );
  await page.route("**/upload-overlap-*", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.goto("/products/new");
  const input = page.getByLabel("이미지 선택");
  const files = (prefix: string) =>
    [1, 2, 3].map((index) => ({
      name: `${prefix}-${index}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(`${prefix}-${index}`),
    }));

  await input.setInputFiles(files("first"));
  await expect.poll(() => started).toHaveLength(3);
  await input.setInputFiles(files("second"));

  await expect.poll(() => started).toHaveLength(3);
  expect(maxActive).toBe(3);
  releaseReservations();
  await expect(page.locator(".images article")).toHaveCount(6);
  expect(maxActive).toBe(3);
});

test("save actions remain disabled until image upload completes", async ({
  page,
}) => {
  let completeUpload = () => {};
  const uploadComplete = new Promise<void>((resolve) => {
    completeUpload = resolve;
  });
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      ImageUpload: () => ({
        createProductImageUpload: {
          key: "products/user-1/pending.png",
          uploadUrl: "http://127.0.0.1:3002/upload-pending",
          originalUrl: "http://images.test/pending.png",
          imageUrl: "http://images.test/pending-transformed.png",
        },
      }),
    }),
  );
  await page.route("**/upload-pending", async (route) => {
    await uploadComplete;
    await route.fulfill({ status: 204 });
  });
  await page.goto("/products/new");
  await page.getByLabel("이미지 선택").setInputFiles({
    name: "pending.png",
    mimeType: "image/png",
    buffer: Buffer.from("image"),
  });
  await expect(page.getByAltText("상품 이미지 1")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await expect(page.getByAltText("상품 이미지 1")).not.toHaveAttribute(
    "src",
    /_next\/image/,
  );
  await expect(page.getByRole("button", { name: "임시 저장" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "심사 요청" })).toBeDisabled();
  completeUpload();
  await expect(page.getByRole("button", { name: "임시 저장" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "심사 요청" })).toBeEnabled();
});

test("concurrent image selections reserve the ten-image limit", async ({
  page,
}) => {
  const crowded = {
    ...product(),
    imageKeys: Array.from(
      { length: 9 },
      (_, index) =>
        `products/user-1/00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}.png`,
    ),
    imageUrls: Array.from(
      { length: 9 },
      (_, index) => `https://images.test/product-${index + 1}.png`,
    ),
  };
  let completeFirstSetup = () => {};
  const firstSetup = new Promise<void>((resolve) => {
    completeFirstSetup = resolve;
  });
  let uploadNumber = 0;
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProduct: () => ({ myPartnerProduct: crowded }),
      ImageUpload: async () => {
        uploadNumber += 1;
        if (uploadNumber === 1) await firstSetup;
        return {
          createProductImageUpload: {
            key: `products/user-1/10000000-0000-4000-8000-${String(uploadNumber).padStart(12, "0")}.png`,
            uploadUrl: `http://127.0.0.1:3002/upload-slot-${uploadNumber}`,
            originalUrl: `https://images.test/upload-${uploadNumber}.png`,
            imageUrl: `https://images.test/upload-${uploadNumber}.png`,
          },
        };
      },
    }),
  );
  await page.route("**/upload-slot-*", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.goto("/products/product-1/edit");
  const input = page.getByLabel("이미지 선택");

  await input.setInputFiles({
    name: "first.png",
    mimeType: "image/png",
    buffer: Buffer.from("first"),
  });
  await expect
    .poll(
      () => calls.filter((call) => call.query.includes("ImageUpload")).length,
    )
    .toBe(1);
  await input.setInputFiles({
    name: "second.png",
    mimeType: "image/png",
    buffer: Buffer.from("second"),
  });
  completeFirstSetup();

  await expect(page.locator(".images article")).toHaveCount(10);
  await expect(
    page.getByText("이미지는 최대 10장까지 등록할 수 있습니다.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    calls.filter((call) => call.query.includes("ImageUpload")),
  ).toHaveLength(1);
});

test("removing an uploading image does not show a cancellation error", async ({
  page,
}) => {
  expectedRequestFailures.set(page, [/PUT .*\/upload-cancelled$/]);
  let completeUpload = () => {};
  const uploadComplete = new Promise<void>((resolve) => {
    completeUpload = resolve;
  });
  await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      ImageUpload: () => ({
        createProductImageUpload: {
          key: "products/user-1/cancelled.png",
          uploadUrl: "http://127.0.0.1:3002/upload-cancelled",
          originalUrl: "http://images.test/cancelled.png",
          imageUrl: "http://images.test/cancelled-transformed.png",
        },
      }),
    }),
  );
  await page.route("**/upload-cancelled", async (route) => {
    await uploadComplete;
    await route.fulfill({ status: 204 });
  });
  await page.goto("/products/new");
  await page.getByLabel("이미지 선택").setInputFiles({
    name: "cancelled.png",
    mimeType: "image/png",
    buffer: Buffer.from("image"),
  });
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  completeUpload();
  await expect(page.getByAltText("상품 이미지 1")).toHaveCount(0);
  await expect(page.getByText("이미지 업로드가 취소되었습니다.")).toHaveCount(
    0,
  );
});

test("leaving during upload setup does not start an orphan upload", async ({
  page,
}) => {
  let completeSetup = () => {};
  const setupComplete = new Promise<void>((resolve) => {
    completeSetup = resolve;
  });
  let uploadRequests = 0;
  const calls = await routeGraphQl(
    page,
    protectedHandlers({
      CatalogOptions: () => options,
      PartnerProducts: () => list(),
      ImageUpload: async () => {
        await setupComplete;
        return {
          createProductImageUpload: {
            key: "products/user-1/orphan.png",
            uploadUrl: "http://127.0.0.1:3002/upload-orphan",
            originalUrl: "http://images.test/orphan.png",
            imageUrl: "http://images.test/orphan-transformed.png",
          },
        };
      },
    }),
  );
  await page.route("**/upload-orphan", async (route) => {
    uploadRequests += 1;
    await route.fulfill({ status: 204 });
  });
  await page.goto("/products/new");
  await page.getByLabel("이미지 선택").setInputFiles({
    name: "orphan.png",
    mimeType: "image/png",
    buffer: Buffer.from("image"),
  });
  await expect
    .poll(() => calls.some((call) => call.query.includes("ImageUpload")))
    .toBe(true);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("link", { name: "상품 관리" }).click();
  await expect(page).toHaveURL(/\/products$/);
  const setupResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/graphql") &&
      response.request().postData()?.includes("ImageUpload") === true,
  );
  completeSetup();
  await (await setupResponse).finished();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );

  expect(uploadRequests).toBe(0);
});
