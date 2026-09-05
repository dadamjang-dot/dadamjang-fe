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
  expectedCart?: CheckoutExpectedCartItem[];
};

export type CheckoutExpectedCartItem = {
  cartItemId: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
};

export type CheckoutCartResult = {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
};

export type CheckoutAttemptResult =
  | { status: "CONFIRMED"; orderId: string }
  | { status: "NOT_OBSERVED"; orderId: null };

export type CheckoutAttemptSnapshotItem = CheckoutExpectedCartItem & {
  productId: string;
  productTitle: string;
  optionName: string;
};

export type CheckoutAttempt = {
  userId: string;
  generation: number;
  idempotencyKey: string;
  expectedCart?: CheckoutAttemptSnapshotItem[];
  phase:
    | "submitting"
    | "uncertain"
    | "checking"
    | "retrying"
    | "confirmed"
    | "rejected";
  orderId?: string;
  startedAt: number;
  lastCheckedAt?: number;
};

export type CheckoutCartOptions = {
  items: Cart["items"];
};
