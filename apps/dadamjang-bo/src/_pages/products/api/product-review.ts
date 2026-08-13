import { requestGraphQl, type AdminProductDetail } from "@/shared/api";

const REVIEW_PRODUCT_MUTATION = `
  mutation ReviewProduct($input: ReviewProductInput!) {
    reviewProduct(input: $input) {
      productId partnerId partnerName categoryId categoryName title description imageUrls status approvalStatus
      rejectionReason thumbnailUrl createdAt
      skus { skuId code optionName price stock isActive }
      auditLogs { auditLogId actorUserid action entityType entityId metadataJson createdAt }
    }
  }
`;

export type ProductReviewInput = {
  productId: string;
  approved: boolean;
  rejectionReason?: string;
};

export const reviewProduct = async (input: ProductReviewInput) =>
  (
    await requestGraphQl<
      { reviewProduct: AdminProductDetail },
      { input: ProductReviewInput }
    >(REVIEW_PRODUCT_MUTATION, {
      input,
    })
  ).reviewProduct;
