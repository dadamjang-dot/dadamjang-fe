import { LegendList } from "@legendapp/list/react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useAuthActionGate } from "@/features/auth";
import { useOrders } from "@/features/order";

const OrdersScreen = () => {
  const router = useRouter();
  const { authStatus, isAuthenticated, redirectToSignIn, retryAuth } =
    useAuthActionGate("/orders");
  const orders = useOrders(isAuthenticated);

  useEffect(() => {
    if (authStatus === "unauthenticated") redirectToSignIn(true);
  }, [authStatus, redirectToSignIn]);

  if (authStatus === "loading" || authStatus === "offline")
    return (
      <Text style={s.state}>
        {authStatus === "offline"
          ? "연결을 기다리고 있어요."
          : "로그인 상태를 확인하고 있어요."}
      </Text>
    );
  if (authStatus === "error") {
    return (
      <View style={s.stateGroup}>
        <Text style={s.state}>로그인 상태를 확인하지 못했어요.</Text>
        <Pressable onPress={() => void retryAuth()}>
          <Text style={s.link}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }
  if (!isAuthenticated)
    return <Text style={s.state}>로그인 화면으로 이동하고 있어요.</Text>;

  if (orders.isLoading)
    return <Text style={s.state}>주문 내역을 불러오는 중이에요.</Text>;
  if (orders.isError) {
    return (
      <View style={s.stateGroup}>
        <Text style={s.state}>주문 내역을 불러오지 못했어요.</Text>
        <Pressable onPress={() => orders.refetch()} testID="e2e.order.retry">
          <Text style={s.link}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <LegendList
      accessibilityLabel="주문 내역"
      contentContainerStyle={s.content}
      data={orders.data ?? []}
      keyExtractor={(order) => order.orderId}
      ListEmptyComponent={<Text style={s.state}>주문 내역이 없어요.</Text>}
      recycleItems
      renderItem={({ item: order }) => (
        <Pressable
          onPress={() => router.push(`/order/${order.orderId}`)}
          style={s.item}
          testID={`e2e.order.open.${order.orderId}`}
        >
          <Text style={s.title}>{order.orderNumber}</Text>
          <Text style={s.meta}>{order.paymentStatus}</Text>
        </Pressable>
      )}
      showsVerticalScrollIndicator={false}
      style={s.container}
      testID="e2e.order.history"
    />
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { gap: 12, padding: 20 },
  item: {
    gap: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
  },
  title: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.muted },
  stateGroup: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  state: { padding: 24, color: colors.muted, textAlign: "center" },
  link: { color: colors.primary, fontWeight: "700" },
});

export default OrdersScreen;
