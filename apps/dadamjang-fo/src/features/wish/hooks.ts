import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
    queryFn: getWishlist,
  });

export const useFollowedBrands = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: wishQueryKeys.followedBrands(),
    queryFn: getFollowedBrands,
  });

export const useRecentlyViewedProducts = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: wishQueryKeys.recentlyViewedProducts(),
    queryFn: getRecentlyViewedProducts,
  });

export const useWishActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: wishQueryKeys.wishlist() });

  return {
    add: useMutation({ mutationFn: addWish, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: removeWish, onSuccess: invalidate }),
  };
};

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
