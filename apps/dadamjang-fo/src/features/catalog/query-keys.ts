import type { ProductFilter } from "./types";

const productFilterKey = (filter: ProductFilter) => ({
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

export const catalogQueryKeys = {
  feed: () => ["feed", "personalized"] as const,
  products: (filter: ProductFilter) =>
    ["products", productFilterKey(filter)] as const,
  product: (productId: string) => ["product", productId] as const,
  categories: () => ["categories"] as const,
  filterOptions: () => ["catalog-filter-options"] as const,
};
