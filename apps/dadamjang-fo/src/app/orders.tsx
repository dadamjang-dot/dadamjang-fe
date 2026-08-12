import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useOrders } from "@/features/order";

const OrdersScreen = () => {
  const router = useRouter();
  const orders = useOrders();

  if (orders.isLoading) return <Text style={s.state}>주문 내역을 불러오는 중이에요.</Text>;
  if (orders.isError) {
    return (
      <View style={s.stateGroup}>
        <Text style={s.state}>주문 내역을 불러오지 못했어요.</Text>
        <Pressable onPress={() => orders.refetch()} testID="e2e.order.retry"><Text style={s.link}>다시 시도</Text></Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.content} style={s.container} testID="e2e.order.history">
      {(orders.data ?? []).map((order) => (
        <Pressable key={order.orderId} onPress={() => router.push(`/order/${order.orderId}`)} style={s.item} testID={`e2e.order.open.${order.orderId}`}>
          <Text style={s.title}>{order.orderNumber}</Text>
          <Text style={s.meta}>{order.paymentStatus}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { gap: 12, padding: 20 },
  item: { gap: 6, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 8 },
  title: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.muted },
  stateGroup: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  state: { padding: 24, color: colors.muted, textAlign: "center" },
  link: { color: colors.primary, fontWeight: "700" },
});

export default OrdersScreen;
