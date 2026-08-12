import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { useOrder } from "@/features/order";

const OrderDetailScreen = () => {
  const { "order-id": orderId } = useLocalSearchParams<{
    "order-id": string;
  }>();
  const order = useOrder(orderId);

  if (order.isLoading) return <Text>주문을 불러오는 중이에요.</Text>;
  if (order.isError || !order.data) return <Text>주문을 불러오지 못했어요.</Text>;

  return (
    <View style={s.container} testID="e2e.checkout.success">
      <Text>{order.data.orderNumber}</Text>
      <Text>{order.data.paymentStatus}</Text>
    </View>
  );
};

const s = StyleSheet.create({ container: { flex: 1 } });

export default OrderDetailScreen;
