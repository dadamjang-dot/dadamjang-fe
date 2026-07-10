import { useQuery } from '@tanstack/react-query';

import { getOrders } from './api';

export const useOrders = () => useQuery({ queryKey: ['orders'], queryFn: getOrders });
