import { router } from 'expo-router';

import { OrderListView, useOrders } from '@/features/order';
import { ScreenTitle } from '@/shared/components';

const OrdersScreen = () => {
  const orders = useOrders();

  return (
    <>
      <ScreenTitle title="주문 내역" subtitle="다담장에 담아 주문한 내역이에요." />
      <OrderListView
        orders={orders.data}
        loading={orders.isPending}
        onPressOrder={(orderId) => router.push(`/order/${orderId}`)}
      />
    </>
  );
};

export default OrdersScreen;
