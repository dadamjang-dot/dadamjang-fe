import { graphqlRequest } from "@dadamjang/graphql-client";

import type {
  CatalogFilterOptions,
  Category,
  PersonalizedFeedConnection,
  ProductConnection,
  ProductFilter,
} from "./types";

export const productFields = `
  productId partnerId brandId categoryId title description imageUrls status isOnSale isExpressDelivery createdAt
  brand { brandId name slug }
  skus { skuId code colorId sizeId optionName price stock }
`;

export const getProducts = async (
  filter: ProductFilter,
): Promise<ProductConnection> => {
  const data = await graphqlRequest<{ products: ProductConnection }>(
    `query Products($filter: ProductFilterInput) {
      products(filter: $filter) {
        nodes { ${productFields} }
        totalCount
        nextCursor
        hasNextPage
      }
    }`,
    { filter },
  );

  return data.products;
};

export const getCategories = async () => {
  const data = await graphqlRequest<{ categories: Category[] }>(
    `query Categories {
      categories { categoryId name slug parentId sortOrder }
    }`,
  );

  return data.categories;
};

export const getCatalogFilterOptions =
  async (): Promise<CatalogFilterOptions> => {
    const data = await graphqlRequest<{
      catalogFilterOptions: CatalogFilterOptions;
    }>(
      `query CatalogFilterOptions {
      catalogFilterOptions {
        categories { categoryId name slug parentId sortOrder }
        brands { brandId name slug }
        colors { colorId name slug hexCode }
        sizes { sizeId name slug sortOrder }
      }
    }`,
    );

    return data.catalogFilterOptions;
  };

export const getPersonalizedFeed = async (
  filter: Pick<ProductFilter, "after" | "first">,
): Promise<PersonalizedFeedConnection> => {
  const data = await graphqlRequest<{
    personalizedFeed: PersonalizedFeedConnection;
  }>(
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
  const data = await graphqlRequest<{
    product: ProductConnection["nodes"][number];
  }>(
    `query Product($productId: String!) { product(productId: $productId) { ${productFields} } }`,
    { productId },
  );

  return data.product;
};
