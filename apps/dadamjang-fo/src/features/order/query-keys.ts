export const orderQueryKeys = {
  list: () => ['orders'] as const,
  detail: (orderId: string) => ['order-detail', orderId] as const,
};
