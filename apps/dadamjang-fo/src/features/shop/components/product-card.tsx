import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import type { ProductPriceSummary } from "@/features/price-evidence";

type ProductCardProps = {
  product: ProductPriceSummary;
  isLiked: boolean;
  onPress: () => void;
  onToggleLike: (productId: string, nextLiked: boolean) => void;
};

const formatPrice = (price: number) => `${price.toLocaleString("ko-KR")}원`;

const ProductCard = ({
  product,
  isLiked,
  onPress,
  onToggleLike,
}: ProductCardProps) => {
  const imageUrl = product.thumbnail;

  return (
    <View style={s.card}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [s.productButton, pressed && s.pressedCard]}
        testID={`e2e.product.open.${product.productId}`}
      >
        <View style={s.imageWrapper}>
          {imageUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: imageUrl }}
              style={s.image}
            />
          ) : (
            <View style={s.imagePlaceholder} />
          )}
          {product.isOnSale ? (
            <View style={s.saleLabel}>
              <Text style={s.saleLabelText}>슈퍼세일</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={2} style={s.title}>
          {product.name}
        </Text>
        <View style={s.priceRow}>
          <Text style={s.price}>{formatPrice(product.finalPrice)}</Text>
          {product.basePrice > product.finalPrice ? (
            <Text style={s.originalPrice}>
              {formatPrice(product.basePrice)}
            </Text>
          ) : null}
        </View>
        {product.isExpressDelivery ? (
          <Text style={s.expressLabel}>바로배송</Text>
        ) : null}
      </Pressable>
      <Pressable
        accessibilityLabel={
          isLiked ? `${product.name} 좋아요 취소` : `${product.name} 좋아요`
        }
        accessibilityRole="button"
        accessibilityState={{ selected: isLiked }}
        hitSlop={spacing.sm}
        onPress={() => onToggleLike(product.productId, !isLiked)}
        style={({ pressed }) => [
          s.likeButton,
          isLiked && s.likedButton,
          pressed && s.pressedLikeButton,
        ]}
        testID={`e2e.wish.${isLiked ? "remove" : "add"}.${product.productId}`}
      >
        <Image
          source={isLiked ? "sf:heart.fill" : "sf:heart"}
          style={[s.likeIcon, isLiked && s.likedIcon]}
        />
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    width: "48%",
    minWidth: 0,
    position: "relative",
  },
  productButton: {
    gap: spacing.sm,
  },
  pressedCard: {
    opacity: 0.72,
  },
  imageWrapper: {
    aspectRatio: 0.78,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: colors.primarySoft,
  },
  saleLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopRightRadius: 8,
    backgroundColor: colors.accent,
  },
  saleLabelText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "700",
  },
  likeButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  likedButton: {
    backgroundColor: colors.primarySoft,
  },
  pressedLikeButton: {
    opacity: 0.64,
  },
  likeIcon: {
    width: 20,
    height: 20,
    tintColor: colors.ink,
  },
  likedIcon: {
    tintColor: colors.accent,
  },
  title: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  price: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  originalPrice: {
    color: colors.muted,
    fontSize: 12,
    textDecorationLine: "line-through",
    fontVariant: ["tabular-nums"],
  },
  expressLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
});

export default ProductCard;
