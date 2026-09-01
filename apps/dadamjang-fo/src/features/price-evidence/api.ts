import { graphqlRequest } from "@dadamjang/graphql-client";

import type {
  ProductPriceSummaryConnection,
  ProductPriceSummaryFilter,
} from "./types";

const productPriceSummaryFields = `
  productId
  name
  thumbnail
  isOnSale
  isExpressDelivery
  basePrice
  finalPrice
  priceRevision
  lowestPriceEvidenceSummary
`;

export const getProductPriceSummaries = async (
  filter: ProductPriceSummaryFilter,
  signal?: AbortSignal,
): Promise<ProductPriceSummaryConnection> => {
  const data = await graphqlRequest<{
    productPriceSummaries: ProductPriceSummaryConnection;
  }>(
    `query ProductPriceSummaries($filter: ProductFilterInput) {
      productPriceSummaries(filter: $filter) {
        nodes { ${productPriceSummaryFields} }
        totalCount
        nextCursor
        hasNextPage
      }
    }`,
    { filter },
    { signal },
  );

  return data.productPriceSummaries;
};

export const getProductPriceSummary = async (
  productId: string,
  signal?: AbortSignal,
) => {
  const data = await graphqlRequest<{
    productPriceSummary: ProductPriceSummaryConnection["nodes"][number];
  }>(
    `query ProductPriceSummary($productId: String!) {
      productPriceSummary(productId: $productId) {
        ${productPriceSummaryFields}
      }
    }`,
    { productId },
    { signal },
  );

  return data.productPriceSummary;
};
