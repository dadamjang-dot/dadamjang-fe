import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
  requestGraphQl,
  type AdminOrder,
  type AdminOrderDetail,
  type Connection,
} from "@/shared/api";

export type OrderFilter = {
  query?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
};

const ORDERS_QUERY = `
  query AdminOrders($filter: AdminOrderFilterInput) {
    adminOrders(filter: $filter) {
      nodes {
        orderId orderNumber buyerUserId buyerUserid buyerEmail status paymentStatus totalAmount
        itemCount allowedNextStatuses createdAt
      }
      nextCursor hasNextPage totalCount
    }
  }
`;

const ORDER_QUERY = `
  query AdminOrder($orderId: String!) {
    adminOrder(orderId: $orderId) {
      orderId orderNumber buyerUserId buyerUserid buyerEmail status paymentStatus paymentFailureReason
      totalAmount itemCount allowedNextStatuses createdAt
      items { orderItemId productId skuId productTitle skuOptionName unitPrice quantity }
      auditLogs { auditLogId actorUserid action entityType entityId metadataJson createdAt }
    }
  }
`;

export const orderQueries = {
  all: () => ["admin-orders"] as const,
  lists: () => [...orderQueries.all(), "list"] as const,
  list: (filter: OrderFilter) =>
    infiniteQueryOptions({
      queryKey: [...orderQueries.lists(), filter],
      queryFn: async ({ pageParam }) =>
        (
          await requestGraphQl<
            { adminOrders: Connection<AdminOrder> },
            { filter: OrderFilter & { after: string | null; first: number } }
          >(ORDERS_QUERY, {
            filter: { ...filter, after: pageParam, first: 30 },
          })
        ).adminOrders,
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) =>
        lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    }),
  detail: (orderId: string) =>
    queryOptions({
      queryKey: [...orderQueries.all(), "detail", orderId],
      queryFn: async () =>
        (
          await requestGraphQl<
            { adminOrder: AdminOrderDetail },
            { orderId: string }
          >(ORDER_QUERY, { orderId })
        ).adminOrder,
    }),
};
