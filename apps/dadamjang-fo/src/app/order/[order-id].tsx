import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  type OrderStatus,
  type PaymentStatus,
} from "@dadamjang/domain";

import { useAuthActionGate } from "@/features/auth";
import { useOrder } from "@/features/order";
import { Button } from "@/shared/components";

const checkoutState = (status: OrderStatus, paymentStatus: PaymentStatus) => {
  if (paymentStatus === "CANCELLED")
    return { message: "결제가 취소됐어요.", testID: "e2e.checkout.cancelled" };
  if (status === "CANCELLED")
    return {
      message: "주문이 취소됐어요. 결제 취소/환불 상태를 확인해 주세요.",
      testID: "e2e.order.cancelled",
    };
  if (status === "FAILED" || paymentStatus === "FAILED")
    return { message: "결제에 실패했어요.", testID: "e2e.checkout.failure" };
  if (status === "PAYMENT_PENDING" && paymentStatus === "PENDING")
    return {
      message: "결제 승인을 기다리고 있어요.",
      testID: "e2e.checkout.pending",
    };
  if (
    (status === "PAID" || status === "FULFILLING" || status === "COMPLETED") &&
    paymentStatus === "APPROVED"
  )
    return { message: "결제가 완료됐어요.", testID: "e2e.checkout.success" };
  return { message: "결제 상태를 확인해 주세요.", testID: "e2e.order.detail" };
};

const OrderDetailScreen = () => {
  const { "order-id": orderId } = useLocalSearchParams<{
    "order-id": string;
  }>();
  const { authStatus, isAuthenticated, redirectToSignIn, retryAuth } =
    useAuthActionGate(`/order/${orderId}`);
  const order = useOrder(orderId, isAuthenticated);

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
  if (authStatus === "error")
    return (
      <View style={s.stateGroup}>
        <Text style={s.state}>로그인 상태를 확인하지 못했어요.</Text>
        <Button
          accessibilityLabel="다시 시도"
          onPress={() => void retryAuth()}
          variant="bare"
        >
          <Text style={s.link}>다시 시도</Text>
        </Button>
      </View>
    );
  if (!isAuthenticated)
    return <Text style={s.state}>인증 화면으로 이동하고 있어요.</Text>;

  if (order.isLoading)
    return <Text style={s.state}>주문을 불러오는 중이에요.</Text>;
  if (order.isError || !order.data)
    return <Text style={s.state}>주문을 불러오지 못했어요.</Text>;
  const state = checkoutState(order.data.status, order.data.paymentStatus);

  return (
    <View style={s.container} testID={state.testID}>
      <Text>{state.message}</Text>
      <Text>{order.data.orderNumber}</Text>
      <Text>{ORDER_STATUS_LABEL[order.data.status]}</Text>
      <Text>{PAYMENT_STATUS_LABEL[order.data.paymentStatus]}</Text>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  stateGroup: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  state: { padding: 24, color: colors.muted, textAlign: "center" },
  link: { color: colors.primary, fontWeight: "700" },
});

export default OrderDetailScreen;
