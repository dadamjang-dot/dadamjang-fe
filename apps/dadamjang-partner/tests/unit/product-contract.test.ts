import { describe, expect, it } from "vitest";
import { effectiveProductState, isProductEditable } from "@/entities/product";
import {
  PARTNER_PRODUCT_MUTATION_FIELDS,
  productFilterVariables,
  productInputVariables,
} from "@/shared/api";
describe("partner product contract", () => {
  it.each([
    ["DRAFT", true],
    ["REJECTED", true],
    ["PENDING", false],
    ["APPROVED", false],
    ["PUBLISHED", false],
  ] as const)("%s editable is %s", (state, value) =>
    expect(isProductEditable(state)).toBe(value),
  );
  it.each([
    ["UNPUBLISHED", "DRAFT", "DRAFT"],
    ["UNPUBLISHED", "REJECTED", "REJECTED"],
    ["UNPUBLISHED", "APPROVED", "APPROVED"],
    ["PUBLISHED", "APPROVED", "PUBLISHED"],
  ] as const)("derives %s / %s as %s", (status, approvalStatus, expected) => {
    expect(effectiveProductState({ status, approvalStatus })).toBe(expected);
  });
  it("uses the authoritative mutation fields", () => {
    expect(PARTNER_PRODUCT_MUTATION_FIELDS).toEqual({
      create: "createPartnerProductDraft",
      update: "updatePartnerProductDraft",
      submit: "submitPartnerProductForReview",
      publish: "publishPartnerProduct",
    });
    expect(
      Object.values(PARTNER_PRODUCT_MUTATION_FIELDS).join(" "),
    ).not.toMatch(/MyPartnerProduct/);
  });
  it("uses exact filter names", () => {
    const variables = productFilterVariables({
      query: "셔츠",
      state: "DRAFT",
      categoryId: "tops",
      after: "cursor",
      first: 20,
    });
    expect(variables).toEqual({
      filter: {
        query: "셔츠",
        state: "DRAFT",
        categoryId: "tops",
        after: "cursor",
        first: 20,
      },
    });
    expect(variables.filter).not.toHaveProperty("search");
    expect(variables.filter).not.toHaveProperty("status");
  });
  it("never saves a brandId or skuId", () => {
    const variables = productInputVariables({
      categoryId: "tops",
      title: "셔츠",
      description: "",
      imageKeys: [],
      skus: [
        {
          code: "A",
          colorId: "black",
          sizeId: "m",
          optionName: "검정 M",
          price: 1000,
          stock: 2,
        },
      ],
      isOnSale: true,
      isExpressDelivery: false,
    });
    expect(variables.input).not.toHaveProperty("brandId");
    expect(variables.input.skus[0]).not.toHaveProperty("skuId");
  });
});
