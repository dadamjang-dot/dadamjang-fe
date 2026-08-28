export type OrderStatus =
  | "PAYMENT_PENDING"
  | "PAID"
  | "FULFILLING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export type PaymentStatus = "PENDING" | "APPROVED" | "FAILED" | "CANCELLED";

export const ORDER_STATUS_LABEL = {
  PAYMENT_PENDING: "결제 대기",
  PAID: "결제 완료",
  FULFILLING: "처리 중",
  COMPLETED: "처리 완료",
  CANCELLED: "주문 취소",
  FAILED: "결제 실패",
} as const satisfies Record<OrderStatus, string>;

export const PAYMENT_STATUS_LABEL = {
  PENDING: "승인 대기",
  APPROVED: "승인 완료",
  FAILED: "승인 실패",
  CANCELLED: "결제 취소",
} as const satisfies Record<PaymentStatus, string>;

export const isOrderCancelable = (status: OrderStatus) =>
  status === "PAYMENT_PENDING" || status === "PAID";

export const canRequestRefund = (_status: OrderStatus) => false;
