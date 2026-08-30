import { graphqlRequest } from "@dadamjang/graphql-client";

import { productFields } from "@/features/catalog/api";

import type { ComparisonItem } from "./types";

export const getComparison = async (signal?: AbortSignal) => {
  const data = await graphqlRequest<{ comparison: ComparisonItem[] }>(
    `query Comparison {
      comparison {
        comparisonItemId
        productId
        createdAt
        product { ${productFields} }
      }
    }`,
    undefined,
    { signal },
  );

  return data.comparison;
};

export const addComparisonItem = async (productId: string) =>
  graphqlRequest(
    `mutation AddComparisonItem($productId: String!) {
      addComparisonItem(productId: $productId) { comparisonItemId productId createdAt }
    }`,
    { productId },
  );

export const removeComparisonItem = async (productId: string) =>
  graphqlRequest(
    "mutation RemoveComparisonItem($productId: String!) { removeComparisonItem(productId: $productId) }",
    { productId },
  );
