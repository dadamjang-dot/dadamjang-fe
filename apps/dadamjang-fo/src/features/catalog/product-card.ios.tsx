import { Image } from 'expo-image';
import { Host, RNHostView, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  border,
  cornerRadius,
  font,
  foregroundStyle,
  lineLimit,
  onTapGesture,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native-unistyles';

import { colors } from '@dadamjang/design-tokens';

import type { Product } from './types';

type ProductCardProps = {
  product: Product;
  onPress: () => void;
};

const getPrice = (product: Product) => product.skus[0]?.price ?? 0;

export const ProductCard = ({ product, onPress }: ProductCardProps) => (
  <Host matchContents style={styles.host}>
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[
        padding({ all: 12 }),
        background(colors.surface),
        border({ color: colors.line, width: 1 }),
        cornerRadius(18),
        onTapGesture(onPress),
      ]}>
      <RNHostView matchContents>
        <Image source={product.imageUrls[0]} style={styles.image} contentFit="cover" transition={160} />
      </RNHostView>
      <Text modifiers={[font({ size: 11, weight: 'black' }), foregroundStyle(colors.muted)]}>WISH ITEM</Text>
      <Text modifiers={[font({ size: 15, weight: 'black' }), foregroundStyle(colors.ink), lineLimit(2)]}>
        {product.title}
      </Text>
      <Text modifiers={[font({ size: 18, weight: 'black' }), foregroundStyle(colors.ink)]}>
        {getPrice(product).toLocaleString()}원
      </Text>
    </VStack>
  </Host>
);

const styles = StyleSheet.create({
  host: { marginBottom: 12 },
  image: { width: '100%', height: 248, borderRadius: 14, backgroundColor: colors.canvas },
});
