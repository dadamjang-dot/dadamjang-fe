import type { OrderStatus, PaymentStatus } from "@dadamjang/domain";

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
};

export type CheckoutCartResult = {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
};

export type CheckoutCartOptions = {
  idempotencyKey?: string;
};
