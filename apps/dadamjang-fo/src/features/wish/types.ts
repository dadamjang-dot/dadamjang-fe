import type { Product, ProductSort } from "@/features/catalog";

export const wishTabs = ["PRODUCTS", "STYLES", "BRANDS", "RECENT"] as const;

export type WishTab = (typeof wishTabs)[number];
export type WishProductSort = Exclude<ProductSort, "POPULAR">;

export type WishProductFilters = {
  saleOnly: boolean;
  excludeSoldOut: boolean;
  sort: WishProductSort;
};

export type WishProduct = Product;
