import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useCurrentUser } from "@/features/auth";
import { useCartActions } from "@/features/cart";
import { useProduct } from "@/features/catalog";
import {
  useBrandFollowActions,
  useFollowedBrands,
  useRecordRecentProductView,
} from "@/features/wish";
import { Button } from "@/shared/components/button";

const ProductScreen = () => {
  const router = useRouter();
  const { "product-id": productId } = useLocalSearchParams<{ "product-id": string }>();
  const product = useProduct(productId);
  const cart = useCartActions();
  const currentUser = useCurrentUser();
  const currentUserId = currentUser.data?.userId;
  const followedBrands = useFollowedBrands(
    Boolean(currentUser.data && product.data?.brand),
  );
  const brandActions = useBrandFollowActions();
  const { mutate: recordRecentProductView } = useRecordRecentProductView();
  const [selectedSkuId, setSelectedSkuId] = useState<string>();
  const [quantity, setQuantity] = useState(1);
  const selectedSku =
    product.data?.skus.find(({ skuId }) => skuId === selectedSkuId) ??
    product.data?.skus[0];
  const skuId = selectedSku?.skuId ?? "";

  useEffect(() => {
    const viewedProductId = product.data?.productId;
    if (!currentUserId || !viewedProductId) return;
    recordRecentProductView(viewedProductId);
  }, [currentUserId, product.data?.productId, recordRecentProductView]);

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
    if (!selectedSku || selectedSku.stock < quantity) return;
    cart.upsert.mutate({ skuId, quantity }, { onSuccess: () => router.push("/cart") });
  };

  const brand = product.data.brand;
  const isFollowing = Boolean(
    brand && followedBrands.data?.some((followedBrand) => followedBrand.brandId === brand.brandId),
  );

  const handleToggleBrandFollow = () => {
    if (!brand) return;
    const mutation = isFollowing ? brandActions.unfollow : brandActions.follow;
    mutation.mutate(brand.brandId);
  };

  return (
    <ScrollView contentContainerStyle={s.content} style={s.container}>
      {brand ? (
        <View style={s.brandRow}>
          <Text style={s.brandName}>{brand.name}</Text>
          {currentUser.data ? (
            <Pressable
              accessibilityState={{ selected: isFollowing }}
              onPress={handleToggleBrandFollow}
              style={[s.brandButton, isFollowing && s.followingBrandButton]}
              testID={`e2e.product.brand.follow.${brand.brandId}`}
            >
              <Text style={[s.brandButtonLabel, isFollowing && s.followingBrandButtonLabel]}>
                {isFollowing ? "팔로잉" : "팔로우"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Text style={s.title}>{product.data.title}</Text>
      {product.data.skus.map((sku) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: sku.skuId === skuId }}
          key={sku.skuId}
          onPress={() => {
            setSelectedSkuId(sku.skuId);
            setQuantity(1);
          }}
          style={[s.option, sku.skuId === skuId && s.selectedOption]}
          testID={`e2e.product.sku.${sku.skuId}`}
        >
          <Text style={s.optionLabel}>{sku.optionName}</Text>
        </Pressable>
      ))}
      <View style={s.quantityRow}>
        <Button
          accessibilityLabel="수량 줄이기"
          disabled={quantity <= 1}
          onPress={() => setQuantity((current) => Math.max(1, current - 1))}
          style={s.quantityControl}
          testID="e2e.cart.quantity.decrement"
          variant="bare"
        >
          <Text style={s.quantityButton}>−</Text>
        </Button>
        <Text testID="e2e.cart.quantity.value">{quantity}</Text>
        <Button
          accessibilityLabel="수량 늘리기"
          disabled={!selectedSku || quantity >= selectedSku.stock}
          onPress={() =>
            setQuantity((current) =>
              Math.min(selectedSku?.stock ?? current, current + 1),
            )
          }
          style={s.quantityControl}
          testID="e2e.cart.quantity.increment"
          variant="bare"
        >
          <Text style={s.quantityButton}>+</Text>
        </Button>
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
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  brandName: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  brandButton: { minHeight: 36, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.ink },
  followingBrandButton: { borderColor: colors.line, backgroundColor: colors.primarySoft },
  brandButtonLabel: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  followingBrandButtonLabel: { color: colors.muted },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700" },
  stateGroup: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  state: { padding: 24, color: colors.muted, textAlign: "center" },
  link: { color: colors.primary, fontWeight: "700" },
  option: { minHeight: 48, justifyContent: "center", paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 8 },
  selectedOption: { borderColor: colors.primary },
  optionLabel: { color: colors.ink },
  quantityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24 },
  quantityControl: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  quantityButton: { color: colors.primary, fontSize: 24, fontWeight: "700" },
  primaryButton: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: colors.primary },
  primaryLabel: { color: colors.surface, fontWeight: "700" },
});

export default ProductScreen;
