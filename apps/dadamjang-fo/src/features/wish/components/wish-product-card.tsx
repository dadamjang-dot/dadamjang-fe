import { Image } from "expo-image";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import type { Product } from "@/features/catalog";
import { Button } from "@/shared/components";
import { hasAvailableSku, lowestActiveSkuPrice } from "../wish-product-rules";

type WishProductCardProps = {
  product: Product;
  onPress: () => void;
  onRemove?: () => void;
};

const formatPrice = (price: number) => `${price.toLocaleString("ko-KR")}원`;

const WishProductCard = ({ product, onPress, onRemove }: WishProductCardProps) => {
  const lowestPrice = lowestActiveSkuPrice(product);
  const highestPrice = product.skus.length
    ? Math.max(...product.skus.map((sku) => sku.price))
    : lowestPrice;
  const isAvailable = hasAvailableSku(product);
  const imageUrl = product.imageUrls[0];

  return (
    <View style={s.card}>
      <Button
        accessibilityLabel={product.title}
        onPress={onPress}
        style={({ pressed }) => [s.productButton, pressed && s.pressed]}
        testID={`e2e.product.open.${product.productId}`}
        variant="bare"
      >
        <View style={s.imageWrap}>
          {imageUrl ? (
            <Image contentFit="cover" source={{ uri: imageUrl }} style={s.image} />
          ) : (
            <View style={s.imagePlaceholder} />
          )}
          {product.isOnSale ? (
            <View style={s.saleLabel}>
              <Text style={s.saleLabelText}>슈퍼세일</Text>
            </View>
          ) : null}
          {!isAvailable ? (
            <View style={s.soldOutLabel}>
              <Text style={s.soldOutLabelText}>품절</Text>
            </View>
          ) : null}
        </View>
        <View style={s.content}>
          {product.brand ? <Text style={s.brand}>{product.brand.name}</Text> : null}
          <Text numberOfLines={2} style={s.title}>{product.title}</Text>
          <View style={s.priceRow}>
            <Text style={s.price}>{formatPrice(lowestPrice)}</Text>
            {highestPrice > lowestPrice ? (
              <Text style={s.originalPrice}>{formatPrice(highestPrice)}</Text>
            ) : null}
          </View>
          {product.isExpressDelivery ? <Text style={s.express}>바로배송</Text> : null}
        </View>
      </Button>
      {onRemove ? (
        <Button
          accessibilityLabel={`${product.title} 찜 해제`}
          onPress={onRemove}
          style={s.removeButton}
          testID={`e2e.wish.remove.${product.productId}`}
          variant="bare"
        >
          <Image source="sf:heart.fill" style={s.removeIcon} />
          <Text style={s.removeLabel}>찜 해제</Text>
        </Button>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  card: { position: "relative", minWidth: 0, backgroundColor: colors.surface },
  productButton: { gap: spacing.sm },
  pressed: { opacity: 0.72 },
  imageWrap: {
    aspectRatio: 0.64,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, backgroundColor: colors.primarySoft },
  saleLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopRightRadius: 8,
    backgroundColor: colors.accent,
  },
  saleLabelText: { color: colors.surface, fontSize: 12, fontWeight: "700" },
  soldOutLabel: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  soldOutLabelText: { color: colors.surface, fontSize: 12, fontWeight: "700" },
  content: { gap: spacing.xs },
  brand: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  title: { color: colors.ink, fontSize: 14, lineHeight: 19 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs },
  price: { color: colors.ink, fontSize: 15, fontVariant: ["tabular-nums"], fontWeight: "700" },
  originalPrice: {
    color: colors.muted,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    textDecorationLine: "line-through",
  },
  express: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  removeButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  removeIcon: { width: 15, height: 15, tintColor: colors.accent },
  removeLabel: { color: colors.ink, fontSize: 12, fontWeight: "700" },
});

export default WishProductCard;
