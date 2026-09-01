import type { ProductPriceSummaryFilter } from "./types";

const filterKey = (filter: ProductPriceSummaryFilter) => ({
  query: filter.query?.trim() ?? "",
  categoryId: filter.categoryId ?? null,
  categoryIds: [...(filter.categoryIds ?? [])].sort(),
  brandIds: [...(filter.brandIds ?? [])].sort(),
  colorIds: [...(filter.colorIds ?? [])].sort(),
  sizeIds: [...(filter.sizeIds ?? [])].sort(),
  saleOnly: Boolean(filter.saleOnly),
  expressOnly: Boolean(filter.expressOnly),
  minPrice: filter.minPrice ?? null,
  maxPrice: filter.maxPrice ?? null,
  sort: filter.sort ?? "RECOMMENDED",
});

export const priceEvidenceQueryKeys = {
  products: (filter: ProductPriceSummaryFilter) =>
    ["products", filterKey(filter)] as const,
  productPriceSummary: (filter: ProductPriceSummaryFilter) =>
    ["product-price-summary", filterKey(filter)] as const,
  productPriceSummaryById: (productId: string) =>
    ["product-price-summary", productId] as const,
};
