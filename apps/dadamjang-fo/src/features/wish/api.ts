import { graphqlRequest } from '@dadamjang/graphql-client';

import { productFields } from '@/features/catalog/api';
import type { Product } from '@/features/catalog/types';

export type WishlistItem = {
  wishId: string;
  productId: string;
  createdAt: string;
  product: Product;
};

export const getWishlist = async () => {
  const data = await graphqlRequest<{ wishlist: WishlistItem[] }>(
    `query Wishlist {
      wishlist {
        wishId
        productId
        createdAt
        product { ${productFields} }
      }
    }`,
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
    'mutation RemoveWish($productId: String!) { removeWish(productId: $productId) }',
    { productId },
  );
};
