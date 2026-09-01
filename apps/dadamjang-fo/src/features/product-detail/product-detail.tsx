import { LegendList } from "@legendapp/list/react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useAuthActionGate } from "@/features/auth";
import { useCartActions } from "@/features/cart";
import { useCatalogFilterOptions, useProduct } from "@/features/catalog";
import { useProductPriceSummary } from "@/features/price-evidence";
import {
  useBrandFollowActions,
  useFollowedBrands,
  useRecordRecentProductView,
  useWishActions,
  useWishlist,
} from "@/features/wish";
import { Button } from "@/shared/components/button";

import { ProductImageGallery } from "./product-image-gallery";

export type ProductDetailProps = {
  productId: string;
  onOpenCart: () => void;
};

const formatPrice = (price?: number) =>
  price === undefined ? "가격 정보 없음" : `${price.toLocaleString("ko-KR")}원`;

const ProductDetail = ({ onOpenCart, productId }: ProductDetailProps) => {
  const product = useProduct(productId);
  const catalogFilterOptions = useCatalogFilterOptions();
  const summary = useProductPriceSummary(productId);
  const cart = useCartActions();
  const currentUser = useAuthActionGate(`/product/${productId}`);
  const wishlist = useWishlist(currentUser.isAuthenticated);
  const wishActions = useWishActions();
  const followedBrands = useFollowedBrands(
    Boolean(currentUser.isAuthenticated && product.data?.brand),
  );
  const brandActions = useBrandFollowActions();
  const { mutate: recordRecentProductView } = useRecordRecentProductView();
  const [selectedSkuId, setSelectedSkuId] = useState<string>();
  const [selectedColorId, setSelectedColorId] = useState<string>();
  const [selectedSizeId, setSelectedSizeId] = useState<string>();
  const [quantityDraft, setQuantityDraft] = useState(1);

  useEffect(() => {
    const viewedProductId = product.data?.productId;
    if (!currentUser.data?.userId || !viewedProductId) return;
    recordRecentProductView(viewedProductId);
  }, [
    currentUser.data?.userId,
    product.data?.productId,
    recordRecentProductView,
  ]);

  if (product.isLoading)
    return (
      <View style={s.container}>
        <Text style={s.state}>상품을 불러오는 중이에요.</Text>
      </View>
    );
  if (product.isError || !product.data) {
    return (
      <View style={s.container}>
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
      </View>
    );
  }

  const { data } = product;
  const hasColorDimension = data.skus.some(({ colorId }) => colorId !== null);
  const hasSizeDimension = data.skus.some(({ sizeId }) => sizeId !== null);
  const colorsById = new Map(
    catalogFilterOptions.data?.colors.map((color) => [color.colorId, color]),
  );
  const sizesById = new Map(
    catalogFilterOptions.data?.sizes.map((size) => [size.sizeId, size]),
  );
  const hasResolvedStructuredOptions =
    Boolean(catalogFilterOptions.data) &&
    (!hasColorDimension ||
      data.skus.every(
        ({ colorId }) =>
          colorId !== null && colorId !== "" && colorsById.has(colorId),
      )) &&
    (!hasSizeDimension ||
      data.skus.every(
        ({ sizeId }) => sizeId !== null && sizeId !== "" && sizesById.has(sizeId),
      ));
  const optionKeys = data.skus.map(
    ({ colorId, sizeId }) =>
      `${hasColorDimension ? colorId : ""}:${hasSizeDimension ? sizeId : ""}`,
  );
  const showsSeparatedOptions =
    hasResolvedStructuredOptions &&
    new Set(optionKeys).size === optionKeys.length &&
    (hasColorDimension || hasSizeDimension);
  const colorOptions = catalogFilterOptions.data?.colors.filter((color) =>
    data.skus.some(({ colorId }) => colorId === color.colorId),
  );
  const sizeOptions = catalogFilterOptions.data?.sizes.filter((size) =>
    data.skus.some(({ sizeId }) => sizeId === size.sizeId),
  );
  const selectedSku = data.skus.find(({ skuId }) => skuId === selectedSkuId);
  const hasPurchasableSku = data.skus.some(({ stock }) => stock > 0);
  const isSelectedSkuSoldOut = Boolean(selectedSku && selectedSku.stock <= 0);
  const quantity = selectedSku
    ? selectedSku.stock <= 0
      ? 0
      : Math.min(Math.max(quantityDraft, 1), selectedSku.stock)
    : 1;
  const minimumSkuPrice = data.skus.length
    ? Math.min(...data.skus.map(({ price }) => price))
    : undefined;
  const price =
    selectedSku?.price ?? summary.data?.finalPrice ?? minimumSkuPrice;
  const canBuy = Boolean(
    selectedSku && selectedSku.stock > 0 && !cart.upsert.isPending,
  );
  const isWished = Boolean(
    wishlist.data?.some(
      ({ productId: wishedProductId }) => wishedProductId === data.productId,
    ),
  );
  const brand = data.brand;
  const isFollowing = Boolean(
    brand &&
    followedBrands.data?.some(
      (followedBrand) => followedBrand.brandId === brand.brandId,
    ),
  );
  const purchaseLabel =
    !hasPurchasableSku || isSelectedSkuSoldOut
      ? "품절"
      : selectedSku
        ? "구매하기"
        : "옵션을 선택해 주세요";

  const handleBuy = () => {
    if (!selectedSku || !canBuy) return;
    currentUser.runProtectedAction(() =>
      cart.upsert.mutate(
        { skuId: selectedSku.skuId, quantity },
        { onSuccess: onOpenCart },
      ),
    );
  };

  const selectStructuredOption = (dimension: "color" | "size", id: string) => {
    const nextColorId = dimension === "color" ? id : selectedColorId;
    const nextSizeId = dimension === "size" ? id : selectedSizeId;
    const hasPurchasableCombination = data.skus.some(
      (sku) =>
        sku.stock > 0 &&
        (!hasColorDimension || sku.colorId === nextColorId) &&
        (!hasSizeDimension || sku.sizeId === nextSizeId),
    );
    const resolvedColorId =
      dimension === "size" && !hasPurchasableCombination
        ? undefined
        : nextColorId;
    const resolvedSizeId =
      dimension === "color" && !hasPurchasableCombination
        ? undefined
        : nextSizeId;
    const matchingSkus = data.skus.filter(
      (sku) =>
        (!hasColorDimension || sku.colorId === resolvedColorId) &&
        (!hasSizeDimension || sku.sizeId === resolvedSizeId),
    );

    setSelectedColorId(resolvedColorId);
    setSelectedSizeId(resolvedSizeId);
    setSelectedSkuId(
      matchingSkus.length === 1 ? matchingSkus.at(0)?.skuId : undefined,
    );
    setQuantityDraft(1);
  };

  return (
    <View style={s.container}>
      <LegendList
        accessibilityLabel="상품 옵션 목록"
        contentContainerStyle={s.content}
        data={showsSeparatedOptions ? [] : data.skus}
        extraData={selectedSkuId}
        keyExtractor={(sku) => sku.skuId}
        ListHeaderComponent={
          <View style={s.header}>
            <ProductImageGallery
              imageUrls={data.imageUrls}
              productId={data.productId}
              title={data.title}
            />
            <View style={s.info}>
              <View style={s.brandRow}>
                <Text style={s.brandName}>{brand?.name}</Text>
                <View style={s.actionRow}>
                  <Button
                    accessibilityLabel={isWished ? "찜 취소" : "찜하기"}
                    accessibilityState={{ selected: isWished }}
                    onPress={() =>
                      currentUser.runProtectedAction(() =>
                        (isWished
                          ? wishActions.remove
                          : wishActions.add
                        ).mutate(data.productId),
                      )
                    }
                    testID="e2e.product.wish"
                    variant="bare"
                  >
                    <Text style={s.actionLabel}>
                      {isWished ? "찜됨" : "찜하기"}
                    </Text>
                  </Button>
                  {brand ? (
                    <Button
                      accessibilityLabel={`${brand.name} ${
                        isFollowing ? "팔로우 취소" : "팔로우"
                      }`}
                      accessibilityState={{ selected: isFollowing }}
                      onPress={() =>
                        currentUser.runProtectedAction(() =>
                          (isFollowing
                            ? brandActions.unfollow
                            : brandActions.follow
                          ).mutate(brand.brandId),
                        )
                      }
                      testID={`e2e.product.brand.follow.${brand.brandId}`}
                      variant="bare"
                    >
                      <Text style={s.actionLabel}>
                        {isFollowing ? "팔로잉" : "팔로우"}
                      </Text>
                    </Button>
                  ) : null}
                </View>
              </View>
              <Text style={s.title}>{data.title}</Text>
              <Text style={s.price} testID="e2e.product.price">
                {formatPrice(price)}
              </Text>
              <View style={s.benefits}>
                {data.isExpressDelivery ? (
                  <Text style={s.benefit}>빠른 배송</Text>
                ) : null}
              </View>
              <Text style={s.description}>{data.description}</Text>
              <Text style={s.sectionTitle}>옵션 선택</Text>
              {showsSeparatedOptions && hasColorDimension ? (
                <View
                  accessibilityLabel="컬러"
                  accessibilityRole="radiogroup"
                  style={s.optionGroup}
                >
                  <Text style={s.optionGroupTitle}>컬러</Text>
                  <View style={s.optionChoices}>
                    {colorOptions?.map((color) => {
                      const isDisabled = !data.skus.some(
                        (sku) =>
                          sku.colorId === color.colorId && sku.stock > 0,
                      );
                      return (
                        <Pressable
                          key={color.colorId}
                          accessibilityLabel={color.name}
                          accessibilityRole="radio"
                          accessibilityState={{
                            disabled: isDisabled,
                            selected: selectedColorId === color.colorId,
                          }}
                          disabled={isDisabled}
                          onPress={() =>
                            selectStructuredOption("color", color.colorId)
                          }
                          style={[
                            s.structuredOption,
                            selectedColorId === color.colorId &&
                              s.selectedOption,
                            isDisabled && s.soldOutOption,
                          ]}
                          testID={`e2e.product.color.${color.colorId}`}
                        >
                          <Text style={s.optionLabel}>{color.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
              {showsSeparatedOptions && hasSizeDimension ? (
                <View
                  accessibilityLabel="사이즈"
                  accessibilityRole="radiogroup"
                  style={s.optionGroup}
                >
                  <Text style={s.optionGroupTitle}>사이즈</Text>
                  <View style={s.optionChoices}>
                    {sizeOptions?.map((size) => {
                      const isDisabled = !data.skus.some(
                        (sku) =>
                          sku.sizeId === size.sizeId &&
                          sku.stock > 0 &&
                          (!selectedColorId ||
                            sku.colorId === selectedColorId),
                      );
                      return (
                        <Pressable
                          key={size.sizeId}
                          accessibilityLabel={size.name}
                          accessibilityRole="radio"
                          accessibilityState={{
                            disabled: isDisabled,
                            selected: selectedSizeId === size.sizeId,
                          }}
                          disabled={isDisabled}
                          onPress={() =>
                            selectStructuredOption("size", size.sizeId)
                          }
                          style={[
                            s.structuredOption,
                            selectedSizeId === size.sizeId && s.selectedOption,
                            isDisabled && s.soldOutOption,
                          ]}
                          testID={`e2e.product.size.${size.sizeId}`}
                        >
                          <Text style={s.optionLabel}>{size.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={s.footer}>
            {selectedSku ? (
              <View style={s.quantityRow}>
                <Button
                  accessibilityLabel="수량 줄이기"
                  disabled={quantity <= 1}
                  onPress={() => setQuantityDraft(Math.max(1, quantity - 1))}
                  style={s.quantityControl}
                  testID="e2e.cart.quantity.decrement"
                  variant="bare"
                >
                  <Text style={s.quantityLabel}>−</Text>
                </Button>
                <Text testID="e2e.cart.quantity.value">{quantity}</Text>
                <Button
                  accessibilityLabel="수량 늘리기"
                  disabled={selectedSku.stock <= quantity}
                  onPress={() =>
                    setQuantityDraft(Math.min(selectedSku.stock, quantity + 1))
                  }
                  style={s.quantityControl}
                  testID="e2e.cart.quantity.increment"
                  variant="bare"
                >
                  <Text style={s.quantityLabel}>+</Text>
                </Button>
              </View>
            ) : null}
          </View>
        }
        recycleItems
        renderItem={({ item: sku }) => {
          const isSelected = sku.skuId === selectedSkuId;
          const isSoldOut = sku.stock <= 0;
          return (
            <Pressable
              accessibilityLabel={sku.optionName}
              accessibilityRole="radio"
              accessibilityState={{ disabled: isSoldOut, selected: isSelected }}
              disabled={isSoldOut}
              onPress={() => {
                setSelectedSkuId(sku.skuId);
                setQuantityDraft(1);
              }}
              style={[
                s.option,
                isSelected && s.selectedOption,
                isSoldOut && s.soldOutOption,
              ]}
              testID={`e2e.product.sku.${sku.skuId}`}
            >
              <Text style={s.optionLabel}>{sku.optionName}</Text>
              {isSoldOut ? <Text style={s.soldOutLabel}>품절</Text> : null}
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
        style={s.list}
      />
      <SafeAreaView edges={["bottom"]} style={s.purchaseArea}>
        {cart.upsert.isError ? (
          <Text accessibilityRole="alert" style={s.error}>
            장바구니에 담지 못했어요. 다시 시도해 주세요.
          </Text>
        ) : null}
        <Button
          disabled={!canBuy}
          label={purchaseLabel}
          onPress={handleBuy}
          style={s.purchaseButton}
          testID="e2e.product.buy"
        />
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  list: { flex: 1 },
  content: { paddingBottom: 20 },
  header: { gap: 20 },
  info: { gap: 12, paddingHorizontal: 20 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandName: { flex: 1, color: colors.muted, fontSize: 14, fontWeight: "700" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionLabel: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700" },
  price: { color: colors.ink, fontSize: 22, fontWeight: "700" },
  benefits: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  benefit: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  description: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  option: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
  },
  optionGroup: { gap: 8 },
  optionGroupTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  optionChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  structuredOption: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
  },
  selectedOption: { borderColor: colors.primary },
  soldOutOption: { backgroundColor: colors.primarySoft },
  optionLabel: { color: colors.ink },
  soldOutLabel: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  footer: { paddingHorizontal: 20 },
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
  quantityLabel: { color: colors.primary, fontSize: 24, fontWeight: "700" },
  purchaseArea: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  purchaseButton: { marginBottom: 12 },
  error: { color: colors.danger, textAlign: "center" },
  stateGroup: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  state: { padding: 24, color: colors.muted, textAlign: "center" },
  link: { color: colors.primary, fontWeight: "700" },
});

export { ProductDetail };
