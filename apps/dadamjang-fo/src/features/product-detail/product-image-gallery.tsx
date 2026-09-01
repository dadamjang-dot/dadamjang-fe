import { Image } from "expo-image";
import { useState } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

type ProductImageGalleryProps = {
  productId: string;
  title: string;
  imageUrls: string[];
};

const ProductImageGallery = ({
  imageUrls,
  productId,
  title,
}: ProductImageGalleryProps) => {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  if (imageUrls.length === 0) {
    return (
      <View
        accessible
        accessibilityLabel={`${title} 이미지 없음`}
        accessibilityRole="image"
        style={s.placeholder}
      >
        <Text style={s.placeholderLabel}>상품 이미지가 없어요.</Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        onMomentumScrollEnd={(event) =>
          setPage(
            Math.min(
              imageUrls.length - 1,
              Math.max(
                0,
                Math.round(event.nativeEvent.contentOffset.x / width),
              ),
            ),
          )
        }
        pagingEnabled
        showsHorizontalScrollIndicator={false}
      >
        {imageUrls.map((imageUrl, index) => (
          <Image
            contentFit="cover"
            key={`${productId}:${index}:${imageUrl}`}
            recyclingKey={`${productId}:${index}:${imageUrl}`}
            source={imageUrl}
            style={s.image(width)}
          />
        ))}
      </ScrollView>
      <Text accessibilityLiveRegion="polite" style={s.counter}>
        {page + 1} / {imageUrls.length}
      </Text>
    </View>
  );
};

const s = StyleSheet.create({
  image: (width: number) => ({
    width,
    height: (width * 5) / 4,
    backgroundColor: colors.primarySoft,
  }),
  placeholder: {
    aspectRatio: 4 / 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  placeholderLabel: { color: colors.muted },
  counter: {
    position: "absolute",
    right: 16,
    bottom: 16,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    color: colors.surface,
    backgroundColor: colors.ink,
    fontSize: 12,
    fontWeight: "700",
  },
});

export { ProductImageGallery };
