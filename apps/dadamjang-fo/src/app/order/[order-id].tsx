import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useOrder } from '@/features/order';

const OrderDetailScreen = () => {
  const { 'order-id': orderId } = useLocalSearchParams<{ 'order-id': string }>();
  useOrder(orderId);

  return <View style={s.container} />;
};

const s = StyleSheet.create({ container: { flex: 1 } });

export default OrderDetailScreen;
