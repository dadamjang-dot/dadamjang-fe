import { graphqlRequest } from '@dadamjang/graphql-client';

import type { ProductPriceEvidence, ProductPriceSummaryConnection, ProductPriceSummaryFilter } from './types';

const productPriceSummaryFields = `
  productId
  name
  thumbnail
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
): Promise<ProductPriceSummaryConnection> => {
  const data = await graphqlRequest<{ productPriceSummaries: ProductPriceSummaryConnection }>(
    `query ProductPriceSummaries($filter: ProductFilterInput) {
      productPriceSummaries(filter: $filter) {
        nodes { ${productPriceSummaryFields} }
        nextCursor
        hasNextPage
      }
    }`,
    { filter },
  );

  return data.productPriceSummaries;
};

export const getComparisonPriceSummaries = async () => {
  const data = await graphqlRequest<{ comparisonPriceSummaries: ProductPriceSummaryConnection['nodes'] }>(
    `query ComparisonPriceSummaries {
      comparisonPriceSummaries { ${productPriceSummaryFields} }
    }`,
  );

  return data.comparisonPriceSummaries;
};

export const getProductPriceEvidence = async (productId: string, priceRevision: string) => {
  const data = await graphqlRequest<{ productPriceEvidence: ProductPriceEvidence }>(
    `query ProductPriceEvidence($productId: String!, $priceRevision: String) {
      productPriceEvidence(productId: $productId, priceRevision: $priceRevision) {
        ${productPriceEvidenceFields}
      }
    }`,
    { productId, priceRevision },
  );

  return data.productPriceEvidence;
};
