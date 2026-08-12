import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useCart, useCartActions } from "@/features/cart";

const CartScreen = () => {
  const router = useRouter();
  const { forcePaymentFailure } = useLocalSearchParams<{ forcePaymentFailure?: string }>();
  const cart = useCart();
  const actions = useCartActions();

  if (cart.isLoading) return <Text style={s.state}>장바구니를 불러오는 중이에요.</Text>;
  if (cart.isError || !cart.data) {
    return (
      <View style={s.stateGroup}>
        <Text style={s.state}>장바구니를 불러오지 못했어요.</Text>
        <Pressable onPress={() => cart.refetch()} testID="e2e.cart.retry"><Text style={s.link}>다시 시도</Text></Pressable>
      </View>
    );
  }

  const handleCheckout = () => {
    actions.checkout.mutate(
      { forcePaymentFailure: forcePaymentFailure === "true" },
      { onSuccess: (order) => router.replace(`/order/${order.orderId}`) },
    );
  };

  return (
    <View style={s.container} testID="e2e.cart.screen">
      <ScrollView contentContainerStyle={s.content}>
        {cart.data.items.length === 0 ? <Text style={s.state}>장바구니가 비어 있어요.</Text> : null}
        {cart.data.items.map((item) => (
          <View key={item.cartItemId} style={s.item}>
            <Text style={s.itemTitle}>{item.product.title}</Text>
            <Text style={s.itemMeta}>{item.sku.optionName}</Text>
            <View style={s.quantityRow}>
              <Pressable onPress={() => actions.upsert.mutate({ skuId: item.sku.skuId, quantity: Math.max(1, item.quantity - 1) })} testID={`e2e.cart.decrement.${item.sku.skuId}`}><Text style={s.link}>−</Text></Pressable>
              <Text>{item.quantity}</Text>
              <Pressable onPress={() => actions.upsert.mutate({ skuId: item.sku.skuId, quantity: item.quantity + 1 })} testID={`e2e.cart.increment.${item.sku.skuId}`}><Text style={s.link}>+</Text></Pressable>
              <Pressable onPress={() => actions.remove.mutate(item.sku.skuId)} testID={`e2e.cart.remove.${item.sku.skuId}`}><Text style={s.link}>삭제</Text></Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      {actions.checkout.isError ? <Text style={s.error} testID="e2e.checkout.failure">결제에 실패했어요. 장바구니를 확인해 주세요.</Text> : null}
      <Pressable disabled={cart.data.items.length === 0 || actions.checkout.isPending} onPress={handleCheckout} style={s.checkout} testID="e2e.checkout.submit">
        <Text style={s.checkoutLabel}>결제하기</Text>
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { gap: 12, padding: 20 },
  item: { gap: 6, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 8 },
  itemTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  itemMeta: { color: colors.muted },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  stateGroup: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  state: { padding: 24, color: colors.muted, textAlign: "center" },
  link: { color: colors.primary, fontWeight: "700" },
  error: { paddingHorizontal: 20, color: colors.danger, textAlign: "center" },
  checkout: { minHeight: 52, alignItems: "center", justifyContent: "center", margin: 20, borderRadius: 8, backgroundColor: colors.primary },
  checkoutLabel: { color: colors.surface, fontWeight: "700" },
});

export default CartScreen;
