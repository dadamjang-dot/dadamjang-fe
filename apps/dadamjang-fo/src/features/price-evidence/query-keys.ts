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
  productPriceEvidence: (productId: string, priceRevision: string) =>
    ["product-price-evidence", productId, priceRevision] as const,
  offers: (productId: string) => ["offers", productId] as const,
};
