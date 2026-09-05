import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type MutateOptions,
} from "@tanstack/react-query";
import { getSessionGeneration } from "@dadamjang/graphql-client";

import {
  addWish,
  followBrand,
  getFollowedBrands,
  getRecentlyViewedProducts,
  getWishlist,
  recordRecentProductView,
  removeWish,
  unfollowBrand,
} from "./api";

export const wishQueryKeys = {
  wishlist: () => ["wishlist"] as const,
  followedBrands: () => ["wish", "followed-brands"] as const,
  recentlyViewedProducts: () => ["wish", "recently-viewed-products"] as const,
};

export const useWishlist = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: wishQueryKeys.wishlist(),
    queryFn: ({ signal }) => getWishlist(signal),
  });

export const useFollowedBrands = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: wishQueryKeys.followedBrands(),
    queryFn: ({ signal }) => getFollowedBrands(signal),
  });

export const useRecentlyViewedProducts = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: wishQueryKeys.recentlyViewedProducts(),
    queryFn: ({ signal }) => getRecentlyViewedProducts(signal),
  });

const wishRequests = new WeakMap<QueryClient, Map<string, Promise<void>>>();

const useWishMutation = (nextWished: boolean) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({
      productId,
      generation,
    }: {
      productId: string;
      generation: number;
    }) => {
      let requests = wishRequests.get(queryClient);
      if (!requests) {
        requests = new Map();
        wishRequests.set(queryClient, requests);
      }
      const key = `${generation}:${productId}`;
      const request = (requests.get(key) ?? Promise.resolve()).then(() => {
        if (getSessionGeneration() !== generation)
          throw new Error("Session changed");
        return nextWished ? addWish(productId) : removeWish(productId);
      });
      const settled = request.then(
        () => undefined,
        () => undefined,
      );
      requests.set(key, settled);
      try {
        return await request;
      } finally {
        if (requests.get(key) === settled) requests.delete(key);
        if (requests.size === 0) wishRequests.delete(queryClient);
      }
    },
    onSuccess: (_data, { generation }) => {
      if (getSessionGeneration() === generation)
        return queryClient.invalidateQueries({
          queryKey: wishQueryKeys.wishlist(),
        });
    },
  });
  type Options = MutateOptions<void, Error, string, typeof mutation.context>;
  const wrapOptions = (
    options?: Options,
  ): Parameters<typeof mutation.mutate>[1] => ({
    onSuccess: (data, { productId, generation }, result, context) => {
      if (getSessionGeneration() === generation)
        options?.onSuccess?.(data, productId, result, context);
    },
    onError: (error, { productId, generation }, result, context) => {
      if (getSessionGeneration() === generation)
        options?.onError?.(error, productId, result, context);
    },
    onSettled: (data, error, { productId, generation }, result, context) => {
      if (getSessionGeneration() === generation)
        options?.onSettled?.(data, error, productId, result, context);
    },
  });
  return {
    ...mutation,
    variables: mutation.variables?.productId,
    mutate: (productId: string, options?: Options) =>
      mutation.mutate(
        { productId, generation: getSessionGeneration() },
        wrapOptions(options),
      ),
    mutateAsync: async (productId: string, options?: Options) => {
      const generation = getSessionGeneration();
      const data = await mutation.mutateAsync(
        { productId, generation },
        wrapOptions(options),
      );
      if (getSessionGeneration() !== generation)
        throw new Error("Session changed");
      return data;
    },
  };
};

export const useWishActions = () => ({
  add: useWishMutation(true),
  remove: useWishMutation(false),
});

export const useBrandFollowActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: wishQueryKeys.followedBrands() });

  return {
    follow: useMutation({ mutationFn: followBrand, onSuccess: invalidate }),
    unfollow: useMutation({ mutationFn: unfollowBrand, onSuccess: invalidate }),
  };
};

export const useRecordRecentProductView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordRecentProductView,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: wishQueryKeys.recentlyViewedProducts(),
      }),
  });
};
