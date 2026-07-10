import { graphqlRequest } from '@/shared/api/graphql-client';

import type { ProductConnection, ProductFilter } from './types';

export const productFields = `
  productId partnerId categoryId title description imageUrls status createdAt
  skus { skuId code optionName price stock }
`;

export const getProducts = async (filter: ProductFilter): Promise<ProductConnection> => {
  const data = await graphqlRequest<{ products: ProductConnection }>(
    `query Products($filter: ProductFilterInput) {
      products(filter: $filter) {
        nodes { ${productFields} }
        nextCursor
        hasNextPage
      }
    }`,
    { filter },
  );

  return data.products;
};

export const getPersonalizedFeed = async (filter: Pick<ProductFilter, 'after' | 'first'>): Promise<ProductConnection> => {
  const data = await graphqlRequest<{ personalizedFeed: ProductConnection }>(
    `query PersonalizedFeed($after: String, $first: Int) {
      personalizedFeed(after: $after, first: $first) {
        nodes { ${productFields} }
        nextCursor
        hasNextPage
        personalizedCategoryCount
      }
    }`,
    filter,
  );

  return data.personalizedFeed;
};

export const getProduct = async (productId: string) => {
  const data = await graphqlRequest<{ product: ProductConnection['nodes'][number] }>(
    `query Product($productId: String!) { product(productId: $productId) { ${productFields} } }`,
    { productId },
  );

  return data.product;
};
