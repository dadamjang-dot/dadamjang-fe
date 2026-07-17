import { graphqlRequest } from '@dadamjang/graphql-client';

import { productFields } from '@/features/catalog/api';
import type { Product } from '@/features/catalog/types';

export type WishItem = {
  wishId: string;
  productId: string;
  createdAt: string;
  product: Product;
};

export const getWish = async () => {
  const data = await graphqlRequest<{ wish: WishItem[] }>(
    `query Wish {
      wish {
        wishId
        productId
        createdAt
        product { ${productFields} }
      }
    }`,
  );

  return data.wish;
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
