import { View } from 'react-native';

import { useOrders } from '@/features/order';

const OrdersScreen = () => {
  useOrders();

  return <View style={{ flex: 1 }} />;
};

export default OrdersScreen;
