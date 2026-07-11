import type { ProductPriceSummaryFilter } from './types';

export const priceEvidenceQueryKeys = {
  products: (filter: ProductPriceSummaryFilter) =>
    ['products', filter.query, filter.categoryId, filter.sort, filter.after, filter.first] as const,
  productPriceSummary: (filter: ProductPriceSummaryFilter) =>
    ['product-price-summary', filter.query, filter.categoryId, filter.sort, filter.after, filter.first] as const,
  productPriceEvidence: (productId: string, priceRevision: string) =>
    ['product-price-evidence', productId, priceRevision] as const,
  offers: (productId: string) => ['offers', productId] as const,
};
