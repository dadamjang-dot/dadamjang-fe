import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useCartActions } from "@/features/cart";
import { useProduct } from "@/features/catalog";

const ProductScreen = () => {
  const router = useRouter();
  const { "product-id": productId } = useLocalSearchParams<{ "product-id": string }>();
  const product = useProduct(productId);
  const cart = useCartActions();
  const [skuId, setSkuId] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const firstSku = product.data?.skus[0];
    if (firstSku) setSkuId(firstSku.skuId);
  }, [product.data]);

  if (product.isLoading) return <Text style={s.state}>상품을 불러오는 중이에요.</Text>;
  if (product.isError || !product.data) {
    return (
      <View style={s.stateGroup}>
        <Text style={s.state}>상품을 불러오지 못했어요.</Text>
        <Pressable onPress={() => product.refetch()} testID="e2e.product.retry">
          <Text style={s.link}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  const handleAddCart = () => {
    if (!skuId) return;
    cart.upsert.mutate({ skuId, quantity }, { onSuccess: () => router.push("/cart") });
  };

  return (
    <ScrollView contentContainerStyle={s.content} style={s.container}>
      <Text style={s.title}>{product.data.title}</Text>
      {product.data.skus.map((sku) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: sku.skuId === skuId }}
          key={sku.skuId}
          onPress={() => setSkuId(sku.skuId)}
          style={[s.option, sku.skuId === skuId && s.selectedOption]}
          testID={`e2e.product.sku.${sku.skuId}`}
        >
          <Text style={s.optionLabel}>{sku.optionName}</Text>
        </Pressable>
      ))}
      <View style={s.quantityRow}>
        <Pressable onPress={() => setQuantity((current) => Math.max(1, current - 1))} testID="e2e.cart.quantity.decrement">
          <Text style={s.quantityButton}>−</Text>
        </Pressable>
        <Text testID="e2e.cart.quantity.value">{quantity}</Text>
        <Pressable onPress={() => setQuantity((current) => current + 1)} testID="e2e.cart.quantity.increment">
          <Text style={s.quantityButton}>+</Text>
        </Pressable>
      </View>
      <Pressable onPress={handleAddCart} style={s.primaryButton} testID="e2e.cart.add">
        <Text style={s.primaryLabel}>장바구니 담기</Text>
      </Pressable>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { gap: 16, padding: 24 },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700" },
  stateGroup: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  state: { padding: 24, color: colors.muted, textAlign: "center" },
  link: { color: colors.primary, fontWeight: "700" },
  option: { minHeight: 48, justifyContent: "center", paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 8 },
  selectedOption: { borderColor: colors.primary },
  optionLabel: { color: colors.ink },
  quantityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24 },
  quantityButton: { color: colors.primary, fontSize: 24, fontWeight: "700" },
  primaryButton: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: colors.primary },
  primaryLabel: { color: colors.surface, fontWeight: "700" },
});

export default ProductScreen;
