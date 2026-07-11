export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELED'
  | 'REFUND_REQUESTED'
  | 'REFUNDED';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: '결제 대기',
  PAID: '결제 완료',
  PREPARING: '상품 준비중',
  SHIPPED: '배송중',
  DELIVERED: '배송 완료',
  CANCELED: '주문 취소',
  REFUND_REQUESTED: '환불 요청',
  REFUNDED: '환불 완료',
};

export const isOrderCancelable = (status: OrderStatus) =>
  status === 'PENDING' || status === 'PAID';

export const canRequestRefund = (status: OrderStatus) =>
  status === 'SHIPPED' || status === 'DELIVERED';
