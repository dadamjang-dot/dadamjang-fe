import type { ProductApprovalStatus } from "@dadamjang/domain";
import { requestGraphQl } from "./graphql-client";
export type ApprovalStatus = ProductApprovalStatus;
export type PublicationStatus = "DRAFT" | "PUBLISHED";
export type EffectiveProductState = ApprovalStatus | "PUBLISHED";
export type PartnerDashboard = {
  draftCount: number;
  pendingCount: number;
  rejectedCount: number;
  approvedCount: number;
  publishedCount: number;
};
export const effectiveProductState = ({
  status,
  approvalStatus,
}: Pick<PartnerProduct, "status" | "approvalStatus">): EffectiveProductState =>
  status === "PUBLISHED" ? "PUBLISHED" : approvalStatus;

export type PartnerProduct = {
  productId: string;
  partnerId: string;
  brandId: string | null;
  brand: { brandId: string; name: string; slug: string } | null;
  categoryId: string;
  title: string;
  description: string;
  imageUrls: string[];
  imageKeys: string[];
  status: PublicationStatus;
  approvalStatus: ApprovalStatus;
  rejectionReason: string | null;
  isOnSale: boolean;
  isExpressDelivery: boolean;
  skus: Array<{
    skuId: string;
    code: string;
    colorId: string | null;
    sizeId: string | null;
    optionName: string;
    price: number;
    stock: number;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type ProductFilter = {
  query?: string;
  state?: string;
  categoryId?: string;
  after?: string;
  first: number;
};
export type ProductInput = {
  categoryId: string;
  title: string;
  description: string;
  imageKeys: string[];
  skus: Array<{
    code: string;
    colorId?: string;
    sizeId?: string;
    optionName: string;
    price: number;
    stock: number;
  }>;
  isOnSale: boolean;
  isExpressDelivery: boolean;
};
export type PublishedProductSkuInput = {
  skuId: string;
  price: number;
  stock: number;
};
const PRODUCT_FIELDS = `productId partnerId brandId brand { brandId name slug } categoryId title description imageUrls imageKeys status approvalStatus rejectionReason isOnSale isExpressDelivery skus { skuId code colorId sizeId optionName price stock } createdAt updatedAt`;
export const PARTNER_PRODUCT_MUTATION_FIELDS = {
  create: "createPartnerProductDraft",
  update: "updatePartnerProductDraft",
  publishedInventory: "updatePublishedProductSkus",
  submit: "submitPartnerProductForReview",
  publish: "publishPartnerProduct",
} as const;
export const productFilterVariables = (filter: ProductFilter) => ({ filter });
export const productInputVariables = (input: ProductInput) => ({
  input: {
    ...input,
    skus: input.skus.map(({ colorId, sizeId, ...sku }) => ({
      ...sku,
      ...(colorId?.trim() ? { colorId } : {}),
      ...(sizeId?.trim() ? { sizeId } : {}),
    })),
  },
});
export const getPartnerDashboard = () =>
  requestGraphQl<{ myPartnerDashboard: PartnerDashboard }>(
    `query PartnerDashboard { myPartnerDashboard { draftCount pendingCount rejectedCount approvedCount publishedCount } }`,
  );
export const listProducts = (filter: ProductFilter) =>
  requestGraphQl<{
    myPartnerProducts: {
      nodes: PartnerProduct[];
      nextCursor: string | null;
      hasNextPage: boolean;
      totalCount: number;
    };
  }>(
    `query PartnerProducts($filter: PartnerProductFilterInput!) { myPartnerProducts(filter: $filter) { nodes { ${PRODUCT_FIELDS} } nextCursor hasNextPage totalCount } }`,
    productFilterVariables(filter),
  );
export const getProduct = (productId: string) =>
  requestGraphQl<{ myPartnerProduct: PartnerProduct }>(
    `query PartnerProduct($productId: String!) { myPartnerProduct(productId: $productId) { ${PRODUCT_FIELDS} } }`,
    { productId },
  );
export const catalogOptions = () =>
  requestGraphQl<{
    catalogFilterOptions: {
      categories: Array<{ categoryId: string; name: string }>;
      colors: Array<{ colorId: string; name: string }>;
      sizes: Array<{ sizeId: string; name: string }>;
    };
  }>(
    `query CatalogOptions { catalogFilterOptions { categories { categoryId name } colors { colorId name } sizes { sizeId name } } }`,
  );
export const saveProduct = (
  productId: string | undefined,
  input: ProductInput,
) =>
  productId
    ? requestGraphQl<{ updatePartnerProductDraft: PartnerProduct }>(
        `mutation UpdateProduct($productId: String!, $input: PartnerProductInput!) { updatePartnerProductDraft(productId: $productId, input: $input) { ${PRODUCT_FIELDS} } }`,
        { productId, ...productInputVariables(input) },
      )
    : requestGraphQl<{ createPartnerProductDraft: PartnerProduct }>(
        `mutation CreateProduct($input: PartnerProductInput!) { createPartnerProductDraft(input: $input) { ${PRODUCT_FIELDS} } }`,
        productInputVariables(input),
      );
export const savePublishedProductSkus = (
  productId: string,
  skus: PublishedProductSkuInput[],
) =>
  requestGraphQl<{ updatePublishedProductSkus: PartnerProduct }>(
    `mutation UpdatePublishedProductSkus($input: UpdatePublishedProductSkusInput!) { updatePublishedProductSkus(input: $input) { ${PRODUCT_FIELDS} } }`,
    { input: { productId, skus } },
  );
export const submitProduct = (productId: string) =>
  requestGraphQl<{ submitPartnerProductForReview: PartnerProduct }>(
    `mutation SubmitProduct($productId: String!) { submitPartnerProductForReview(productId: $productId) { ${PRODUCT_FIELDS} } }`,
    { productId },
  );
export const publishProduct = (productId: string) =>
  requestGraphQl<{ publishPartnerProduct: PartnerProduct }>(
    `mutation PublishProduct($productId: String!) { publishPartnerProduct(productId: $productId) { ${PRODUCT_FIELDS} } }`,
    { productId },
  );
export const createImageUpload = (input: {
  filename: string;
  contentType: string;
  fileSize: number;
}) =>
  requestGraphQl<{
    createProductImageUpload: {
      key: string;
      uploadUrl: string;
      originalUrl: string;
      imageUrl: string;
    };
  }>(
    `mutation ImageUpload($input: CreateProductImageUploadInput!) { createProductImageUpload(input: $input) { key uploadUrl originalUrl imageUrl } }`,
    { input },
  );
