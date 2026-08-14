export const PRODUCT_STATES = [
  "DRAFT",
  "PENDING",
  "REJECTED",
  "APPROVED",
  "PUBLISHED",
] as const;
export type ProductState = (typeof PRODUCT_STATES)[number];
export const isProductEditable = (state: ProductState) =>
  state === "DRAFT" || state === "REJECTED";
export type ProductSku = {
  skuId?: string;
  code: string;
  colorId: string;
  sizeId: string;
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
  status: ProductState;
  approvalStatus: string;
  rejectionReason: string | null;
  isOnSale: boolean;
  isExpressDelivery: boolean;
  skus: ProductSku[];
  createdAt: string;
  updatedAt: string;
};
