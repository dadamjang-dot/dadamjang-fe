import type { Product } from "@/features/catalog";

import type { WishProductFilters } from "./types";

export const hasAvailableSku = (product: Product) =>
  product.skus.some((sku) => sku.stock > 0);

export const lowestActiveSkuPrice = (product: Product) =>
  product.skus.length ? Math.min(...product.skus.map((sku) => sku.price)) : 0;

export const filterWishProducts = (
  products: Product[],
  filters: WishProductFilters,
) =>
  products.filter(
    (product) =>
      (!filters.saleOnly || product.isOnSale) &&
      (!filters.excludeSoldOut || hasAvailableSku(product)),
  );

export const sortWishProducts = (
  products: Product[],
  filters: WishProductFilters,
) =>
  products
    .map((product, index) => ({ product, index }))
    .sort((left, right) => {
      const priceDelta =
        filters.sort === "LOW_PRICE"
          ? lowestActiveSkuPrice(left.product) -
            lowestActiveSkuPrice(right.product)
          : lowestActiveSkuPrice(right.product) -
            lowestActiveSkuPrice(left.product);
      const createdAtDelta =
        Date.parse(right.product.createdAt) -
        Date.parse(left.product.createdAt);
      if (filters.sort === "RECOMMENDED") return left.index - right.index;
      if (filters.sort === "LATEST")
        return createdAtDelta || left.index - right.index;
      return priceDelta || createdAtDelta || left.index - right.index;
    })
    .map(({ product }) => product);
