export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: '임시저장',
  ACTIVE: '판매중',
  SOLD_OUT: '품절',
  HIDDEN: '숨김',
};

export const isProductSellable = (status: ProductStatus) => status === 'ACTIVE';
