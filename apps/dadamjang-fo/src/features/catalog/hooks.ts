import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getPersonalizedFeed, getProduct, getProducts } from './api';

export const usePersonalizedFeed = () =>
  useInfiniteQuery({
    queryKey: ['feed', 'personalized'],
    queryFn: ({ pageParam }) => getPersonalizedFeed({ after: pageParam, first: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
    staleTime: 60_000,
  });

export const useProductSearch = (query: string) =>
  useInfiniteQuery({
    queryKey: ['products', query],
    queryFn: ({ pageParam }) => getProducts({ query, after: pageParam, first: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
    enabled: query.trim().length > 0,
  });

export const useProduct = (productId: string) =>
  useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
    enabled: Boolean(productId),
  });
