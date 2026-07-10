import { graphqlRequest } from '@/shared/api/graphql-client';

import { productFields } from '@/features/catalog/api';
import type { Product } from '@/features/catalog/types';

export type WishlistItem = {
  wishlistId: string;
  productId: string;
  createdAt: string;
  product: Product;
};

export const getWishlist = async () => {
  const data = await graphqlRequest<{ wishlist: WishlistItem[] }>(
    `query Wishlist {
      wishlist {
        wishlistId
        productId
        createdAt
        product { ${productFields} }
      }
    }`,
  );

  return data.wishlist;
};

export const addWishlist = async (productId: string) => {
  await graphqlRequest(
    `mutation AddWishlist($productId: String!) {
      addWishlist(productId: $productId) { wishlistId productId createdAt }
    }`,
    { productId },
  );
};

export const removeWishlist = async (productId: string) => {
  await graphqlRequest(
    'mutation RemoveWishlist($productId: String!) { removeWishlist(productId: $productId) }',
    { productId },
  );
};
