import { useLocalSearchParams } from 'expo-router';

import { OrderDetailView, useOrder } from '@/features/order';
import { ScreenTitle } from '@/shared/components';

const OrderDetailScreen = () => {
  const { 'order-id': orderId } = useLocalSearchParams<{ 'order-id': string }>();
  const order = useOrder(orderId);

  return (
    <>
      <ScreenTitle title="주문 상세" subtitle="주문 상품과 결제 상태를 확인해요." />
      <OrderDetailView order={order.data} loading={order.isPending} />
    </>
  );
};

export default OrderDetailScreen;
