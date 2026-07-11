import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getCategories, getPersonalizedFeed, getProduct, getProducts } from './api';
import { catalogQueryKeys } from './query-keys';

import type { ProductSort } from './types';

export const usePersonalizedFeed = () =>
  useInfiniteQuery({
    queryKey: catalogQueryKeys.feed(),
    queryFn: ({ pageParam }) => getPersonalizedFeed({ after: pageParam, first: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
    staleTime: 60_000,
  });

export const useProductSearch = (query: string, categoryId?: string, sort: ProductSort = 'LATEST') =>
  useInfiniteQuery({
    queryKey: catalogQueryKeys.products(query, categoryId, sort),
    queryFn: ({ pageParam }) => getProducts({ query, categoryId, sort, after: pageParam, first: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
    enabled: query.trim().length > 0 || Boolean(categoryId),
  });

export const useProduct = (productId: string) =>
  useQuery({
    queryKey: catalogQueryKeys.product(productId),
    queryFn: () => getProduct(productId),
    enabled: Boolean(productId),
  });

export const useCategories = () => useQuery({ queryKey: catalogQueryKeys.categories(), queryFn: getCategories });
