import { graphqlRequest } from "@dadamjang/graphql-client";

import type {
  ProductPriceEvidence,
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

const productPriceEvidenceFields = `
  productId
  priceRevision
  calculatedAt
  offerSource
  priceHistory { label price recordedAt }
  couponConditions { title discountAmount condition }
  shippingPolicy { title shippingFee condition }
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

export const getComparisonPriceSummaries = async (signal?: AbortSignal) => {
  const data = await graphqlRequest<{
    comparisonPriceSummaries: ProductPriceSummaryConnection["nodes"];
  }>(
    `query ComparisonPriceSummaries {
      comparisonPriceSummaries { ${productPriceSummaryFields} }
    }`,
    undefined,
    { signal },
  );

  return data.comparisonPriceSummaries;
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

export const getProductPriceEvidence = async (
  productId: string,
  priceRevision: string,
  signal?: AbortSignal,
) => {
  const data = await graphqlRequest<{
    productPriceEvidence: ProductPriceEvidence;
  }>(
    `query ProductPriceEvidence($productId: String!, $priceRevision: String) {
      productPriceEvidence(productId: $productId, priceRevision: $priceRevision) {
        ${productPriceEvidenceFields}
      }
    }`,
    { productId, priceRevision },
    { signal },
  );

  return data.productPriceEvidence;
};
