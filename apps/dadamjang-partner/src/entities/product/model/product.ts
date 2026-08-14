import type { ApprovalStatus, PublicationStatus } from "@/shared/api";

export const PRODUCT_STATES = [
  "DRAFT",
  "PENDING",
  "REJECTED",
  "APPROVED",
  "PUBLISHED",
] as const;
export type ProductState = (typeof PRODUCT_STATES)[number];
export { effectiveProductState } from "@/shared/api";
export const isProductEditable = (state: ProductState) =>
  state === "DRAFT" || state === "REJECTED";
export type ProductSku = {
  skuId?: string;
  code: string;
  colorId: string | null;
  sizeId: string | null;
  optionName: string;
  price: number;
  stock: number;
};
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
  skus: ProductSku[];
  createdAt: string;
  updatedAt: string;
};
