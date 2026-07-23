import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useOrders } from '@/features/order';

const OrdersScreen = () => {
  useOrders();

  return <View style={s.container} />;
};

const s = StyleSheet.create({ container: { flex: 1 } });

export default OrdersScreen;
