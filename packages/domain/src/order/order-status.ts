export type OrderStatus =
  | "PAYMENT_PENDING"
  | "PAID"
  | "FULFILLING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PAYMENT_PENDING: "결제 대기",
  PAID: "결제 완료",
  FULFILLING: "처리 중",
  COMPLETED: "처리 완료",
  CANCELLED: "주문 취소",
  FAILED: "결제 실패",
};

export const isOrderCancelable = (status: OrderStatus) =>
  status === "PAYMENT_PENDING" || status === "PAID";

export const canRequestRefund = (_status: OrderStatus) => false;
