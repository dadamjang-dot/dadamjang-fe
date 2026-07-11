export type Cart = {
  cartId: string;
  totalAmount: number;
  items: {
    cartItemId: string;
    quantity: number;
    sku: { skuId: string; optionName: string; price: number };
    product: { productId: string; title: string; imageUrls: string[] };
  }[];
};

export type CheckoutCartInput = {
  idempotencyKey: string;
  forcePaymentFailure?: boolean;
};

export type CheckoutCartOptions = {
  idempotencyKey?: string;
  forcePaymentFailure?: boolean;
};
