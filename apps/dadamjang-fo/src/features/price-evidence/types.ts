import type { ProductFilter } from '@/features/catalog';

export type ProductPriceSummary = {
  productId: string;
  name: string;
  thumbnail: string | null;
  basePrice: number;
  finalPrice: number;
  priceRevision: string;
  lowestPriceEvidenceSummary: string;
};

export type ProductPriceSummaryConnection = {
  nodes: ProductPriceSummary[];
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type ProductPriceHistoryItem = {
  label: string;
  price: number;
  recordedAt: string;
};

export type ProductCouponCondition = {
  title: string;
  discountAmount: number;
  condition: string;
};

export type ProductShippingPolicy = {
  title: string;
  shippingFee: number;
  condition: string;
};

export type ProductPriceEvidence = {
  productId: string;
  priceRevision: string;
  priceHistory: ProductPriceHistoryItem[];
  couponConditions: ProductCouponCondition[];
  shippingPolicy: ProductShippingPolicy;
  offerSource: string;
  calculatedAt: string;
};

export type ProductPriceSummaryFilter = ProductFilter;
