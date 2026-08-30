import { useQuery } from "@tanstack/react-query";

import { getOrder, getOrders } from "./api";
import { orderQueryKeys } from "./query-keys";

export const useOrders = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: orderQueryKeys.list(),
    queryFn: ({ signal }) => getOrders(signal),
  });

export const useOrder = (orderId: string) =>
  useQuery({
    queryKey: orderQueryKeys.detail(orderId),
    queryFn: ({ signal }) => getOrder(orderId, signal),
    enabled: Boolean(orderId),
  });
