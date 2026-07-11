import { useQuery } from '@tanstack/react-query';

import { getOrder, getOrders } from './api';
import { orderQueryKeys } from './query-keys';

export const useOrders = () => useQuery({ queryKey: orderQueryKeys.list(), queryFn: getOrders });

export const useOrder = (orderId: string) =>
  useQuery({
    queryKey: orderQueryKeys.detail(orderId),
    queryFn: () => getOrder(orderId),
    enabled: Boolean(orderId),
  });
