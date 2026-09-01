import type { ProductFilter } from "@/features/catalog";

export type ProductPriceSummary = {
  productId: string;
  name: string;
  thumbnail: string | null;
  basePrice: number;
  finalPrice: number;
  priceRevision: string;
  lowestPriceEvidenceSummary: string;
  isOnSale: boolean;
  isExpressDelivery: boolean;
};

export type ProductPriceSummaryConnection = {
  nodes: ProductPriceSummary[];
  totalCount: number;
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type ProductPriceSummaryFilter = ProductFilter;
