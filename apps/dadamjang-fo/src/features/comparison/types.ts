import type { Product } from "@/features/catalog";

export type ComparisonItem = {
  comparisonItemId: string;
  productId: string;
  product: Product;
  createdAt: string;
};
