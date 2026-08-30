import { LegendList } from "@legendapp/list/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useAuthActionGate } from "@/features/auth";
import { useCartActions } from "@/features/cart";
import { useProduct } from "@/features/catalog";
import { ProductPriceEvidenceSection } from "@/features/price-evidence";
import {
  useBrandFollowActions,
  useFollowedBrands,
  useRecordRecentProductView,
} from "@/features/wish";
import { Button } from "@/shared/components/button";

const ProductScreen = () => {
  const router = useRouter();
  const { "product-id": productId } = useLocalSearchParams<{
    "product-id": string;
  }>();
  const product = useProduct(productId);
  const cart = useCartActions();
  const currentUser = useAuthActionGate(`/product/${productId}`);
  const currentUserId = currentUser.data?.userId;
  const followedBrands = useFollowedBrands(
    Boolean(currentUser.isAuthenticated && product.data?.brand),
  );
  const brandActions = useBrandFollowActions();
  const { mutate: recordRecentProductView } = useRecordRecentProductView();
  const [selectedSkuId, setSelectedSkuId] = useState<string>();
  const [quantityDraft, setQuantityDraft] = useState<{
    skuId?: string;
    value: number;
  }>({ value: 1 });
  const selectedSku =
    product.data?.skus.find(({ skuId }) => skuId === selectedSkuId) ??
    product.data?.skus[0];
  const skuId = selectedSku?.skuId ?? "";
  const isOutOfStock = !selectedSku || selectedSku.stock <= 0;
  const quantity = isOutOfStock
    ? 0
    : quantityDraft.skuId === skuId
      ? Math.min(Math.max(quantityDraft.value, 1), selectedSku.stock)
      : 1;
  const canAddToCart =
    !isOutOfStock && quantity >= 1 && quantity <= selectedSku.stock;

  useEffect(() => {
    const viewedProductId = product.data?.productId;
    if (!currentUserId || !viewedProductId) return;
    recordRecentProductView(viewedProductId);
  }, [currentUserId, product.data?.productId, recordRecentProductView]);

  if (product.isLoading)
    return <Text style={s.state}>상품을 불러오는 중이에요.</Text>;
  if (product.isError || !product.data) {
    return (
      <View style={s.stateGroup}>
        <Text style={s.state}>상품을 불러오지 못했어요.</Text>
        <Button
          accessibilityLabel="다시 시도"
          onPress={() => product.refetch()}
          testID="e2e.product.retry"
          variant="bare"
        >
          <Text style={s.link}>다시 시도</Text>
        </Button>
      </View>
    );
  }

  const handleAddCart = () => {
    if (!canAddToCart) return;
    currentUser.runProtectedAction(() =>
      cart.upsert.mutate(
        { skuId, quantity },
        { onSuccess: () => router.push("/cart") },
      ),
    );
  };

  const brand = product.data.brand;
  const isFollowing = Boolean(
    brand &&
    followedBrands.data?.some(
      (followedBrand) => followedBrand.brandId === brand.brandId,
    ),
  );

  const handleToggleBrandFollow = () => {
    if (!brand) return;
    currentUser.runProtectedAction(() => {
      const mutation = isFollowing
        ? brandActions.unfollow
        : brandActions.follow;
      mutation.mutate(brand.brandId);
    });
  };

  return (
    <LegendList
      accessibilityLabel="상품 옵션 목록"
      contentContainerStyle={s.content}
      data={product.data.skus}
      extraData={[skuId, quantity, selectedSku?.stock, isFollowing]}
      keyExtractor={(sku) => sku.skuId}
      ListHeaderComponent={
        <View style={s.header}>
          {brand ? (
            <View style={s.brandRow}>
              <Text style={s.brandName}>{brand.name}</Text>
              <Button
                accessibilityLabel={`${brand.name} ${
                  isFollowing ? "팔로우 취소" : "팔로우"
                }`}
                accessibilityState={{ selected: isFollowing }}
                onPress={handleToggleBrandFollow}
                style={[s.brandButton, isFollowing && s.followingBrandButton]}
                testID={`e2e.product.brand.follow.${brand.brandId}`}
                variant="bare"
              >
                <Text
                  style={[
                    s.brandButtonLabel,
                    isFollowing && s.followingBrandButtonLabel,
                  ]}
                >
                  {isFollowing ? "팔로잉" : "팔로우"}
                </Text>
              </Button>
            </View>
          ) : null}
          <Text style={s.title}>{product.data.title}</Text>
        </View>
      }
      ListFooterComponent={
        <View style={s.footer}>
          <ProductPriceEvidenceSection productId={product.data.productId} />
          <View style={s.quantityRow}>
            <Button
              accessibilityLabel="수량 줄이기"
              disabled={quantity <= 1}
              onPress={() =>
                setQuantityDraft({
                  skuId,
                  value: Math.max(1, quantity - 1),
                })
              }
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
                setQuantityDraft({
                  skuId,
                  value: Math.min(selectedSku?.stock ?? quantity, quantity + 1),
                })
              }
              style={s.quantityControl}
              testID="e2e.cart.quantity.increment"
              variant="bare"
            >
              <Text style={s.quantityButton}>+</Text>
            </Button>
          </View>
          {isOutOfStock ? (
            <Text accessibilityRole="alert" style={s.stockMessage}>
              선택한 옵션은 품절이에요.
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel={isOutOfStock ? "품절" : "장바구니 담기"}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canAddToCart }}
            disabled={!canAddToCart}
            onPress={handleAddCart}
            style={[s.primaryButton, !canAddToCart && s.primaryButtonDisabled]}
            testID="e2e.cart.add"
          >
            <Text
              style={[s.primaryLabel, !canAddToCart && s.primaryLabelDisabled]}
            >
              {isOutOfStock ? "품절" : "장바구니 담기"}
            </Text>
          </Pressable>
        </View>
      }
      recycleItems
      renderItem={({ item: sku }) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: sku.skuId === skuId }}
          onPress={() => {
            setSelectedSkuId(sku.skuId);
            setQuantityDraft({
              skuId: sku.skuId,
              value: sku.stock > 0 ? 1 : 0,
            });
          }}
          style={[s.option, sku.skuId === skuId && s.selectedOption]}
          testID={`e2e.product.sku.${sku.skuId}`}
        >
          <Text style={s.optionLabel}>{sku.optionName}</Text>
        </Pressable>
      )}
      showsVerticalScrollIndicator={false}
      style={s.container}
    />
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { gap: 16, padding: 24 },
  header: { gap: 16 },
  footer: { gap: 16 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandName: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  brandButton: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  followingBrandButton: {
    borderColor: colors.line,
    backgroundColor: colors.primarySoft,
  },
  brandButtonLabel: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  followingBrandButtonLabel: { color: colors.muted },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700" },
  stateGroup: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  state: { padding: 24, color: colors.muted, textAlign: "center" },
  link: { color: colors.primary, fontWeight: "700" },
  option: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
  },
  selectedOption: { borderColor: colors.primary },
  optionLabel: { color: colors.ink },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  quantityControl: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButton: { color: colors.primary, fontSize: 24, fontWeight: "700" },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  primaryButtonDisabled: { backgroundColor: colors.line },
  primaryLabel: { color: colors.surface, fontWeight: "700" },
  primaryLabelDisabled: { color: colors.muted },
  stockMessage: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});

export default ProductScreen;
