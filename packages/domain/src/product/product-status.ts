export type ProductStatus = "DRAFT" | "PUBLISHED";

export type ProductApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: "임시저장",
  PUBLISHED: "판매중",
};

export const PRODUCT_APPROVAL_STATUS_LABEL: Record<
  ProductApprovalStatus,
  string
> = {
  PENDING: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "승인 반려",
};

export const isProductSellable = (status: ProductStatus) =>
  status === "PUBLISHED";
