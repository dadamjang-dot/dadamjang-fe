import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useOrder } from '@/features/order';

const OrderDetailScreen = () => {
  const { 'order-id': orderId } = useLocalSearchParams<{ 'order-id': string }>();
  useOrder(orderId);

  return <View style={{ flex: 1 }} />;
};

export default OrderDetailScreen;
