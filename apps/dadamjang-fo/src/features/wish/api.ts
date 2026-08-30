import { graphqlRequest } from "@dadamjang/graphql-client";

import { productFields } from "@/features/catalog/api";
import type { Product } from "@/features/catalog/types";

export type FollowedBrand = {
  brandId: string;
  name: string;
  slug: string;
};

export type RecentlyViewedProduct = {
  productId: string;
  viewedAt: string;
  product: Product;
};

export type WishlistItem = {
  wishId: string;
  productId: string;
  createdAt: string;
  product: Product;
};

export const getWishlist = async (signal?: AbortSignal) => {
  const data = await graphqlRequest<{ wishlist: WishlistItem[] }>(
    `query Wishlist {
      wishlist {
        wishId
        productId
        createdAt
        product { ${productFields} }
      }
    }`,
    undefined,
    { signal },
  );

  return data.wishlist;
};

export const addWish = async (productId: string) => {
  await graphqlRequest(
    `mutation AddWish($productId: String!) {
      addWish(productId: $productId) { wishId productId createdAt }
    }`,
    { productId },
  );
};

export const removeWish = async (productId: string) => {
  await graphqlRequest(
    "mutation RemoveWish($productId: String!) { removeWish(productId: $productId) }",
    { productId },
  );
};

export const getFollowedBrands = async (signal?: AbortSignal) => {
  const data = await graphqlRequest<{ followedBrands: FollowedBrand[] }>(
    "query FollowedBrands { followedBrands { brandId name slug } }",
    undefined,
    { signal },
  );
  return data.followedBrands;
};

export const followBrand = async (brandId: string) => {
  const data = await graphqlRequest<{ followBrand: FollowedBrand }>(
    `mutation FollowBrand($brandId: String!) {
      followBrand(brandId: $brandId) { brandId name slug }
    }`,
    { brandId },
  );
  return data.followBrand;
};

export const unfollowBrand = async (brandId: string) => {
  await graphqlRequest(
    "mutation UnfollowBrand($brandId: String!) { unfollowBrand(brandId: $brandId) }",
    { brandId },
  );
};

export const getRecentlyViewedProducts = async (signal?: AbortSignal) => {
  const data = await graphqlRequest<{
    recentlyViewedProducts: RecentlyViewedProduct[];
  }>(
    `query RecentlyViewedProducts {
      recentlyViewedProducts {
        productId
        viewedAt
        product { ${productFields} }
      }
    }`,
    undefined,
    { signal },
  );
  return data.recentlyViewedProducts;
};

export const recordRecentProductView = async (productId: string) => {
  await graphqlRequest(
    "mutation RecordRecentProductView($productId: String!) { recordRecentProductView(productId: $productId) }",
    { productId },
  );
};
