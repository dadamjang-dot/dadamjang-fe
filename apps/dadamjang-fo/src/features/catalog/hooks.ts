import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  getCategories,
  getCatalogFilterOptions,
  getPersonalizedFeed,
  getProduct,
  getProducts,
} from "./api";
import { catalogQueryKeys } from "./query-keys";

import type { ProductFilter, ProductSort } from "./types";

export const usePersonalizedFeed = () =>
  useInfiniteQuery({
    queryKey: catalogQueryKeys.feed(),
    queryFn: ({ pageParam, signal }) =>
      getPersonalizedFeed({ after: pageParam, first: 20 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    staleTime: 60_000,
  });

export const useProductSearch = (
  query: string,
  categoryId?: string,
  sort: ProductSort = "LATEST",
) =>
  useCatalogProducts(
    { query, categoryId, sort },
    query.trim().length > 0 || Boolean(categoryId),
  );

export const useCatalogProducts = (filter: ProductFilter, enabled = true) =>
  useInfiniteQuery({
    queryKey: catalogQueryKeys.products(filter),
    queryFn: ({ pageParam, signal }) =>
      getProducts({ ...filter, after: pageParam, first: 20 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled,
  });

export const useProduct = (productId: string) =>
  useQuery({
    queryKey: catalogQueryKeys.product(productId),
    queryFn: ({ signal }) => getProduct(productId, signal),
    enabled: Boolean(productId),
  });

export const useCategories = () =>
  useQuery({
    queryKey: catalogQueryKeys.categories(),
    queryFn: ({ signal }) => getCategories(signal),
  });

export const useCatalogFilterOptions = () =>
  useQuery({
    queryKey: catalogQueryKeys.filterOptions(),
    queryFn: ({ signal }) => getCatalogFilterOptions(signal),
  });
