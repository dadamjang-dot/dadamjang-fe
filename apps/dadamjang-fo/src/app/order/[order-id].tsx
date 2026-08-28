import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  type OrderStatus,
  type PaymentStatus,
} from "@dadamjang/domain";

import { useOrder } from "@/features/order";

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
  const order = useOrder(orderId);

  if (order.isLoading) return <Text>주문을 불러오는 중이에요.</Text>;
  if (order.isError || !order.data) return <Text>주문을 불러오지 못했어요.</Text>;
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

const s = StyleSheet.create({ container: { flex: 1 } });

export default OrderDetailScreen;
