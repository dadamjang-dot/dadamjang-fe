import { Image } from 'expo-image';
import { Host, RNHostView, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, lineLimit, onTapGesture, padding } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native-unistyles';

import { colors } from '@/theme/tokens';

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
        cornerRadius(20),
        onTapGesture(onPress),
      ]}>
      <RNHostView matchContents>
        <Image source={product.imageUrls[0]} style={styles.image} contentFit="cover" transition={160} />
      </RNHostView>
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(2)]}>{product.title}</Text>
      <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle(colors.primary)]}>
        {getPrice(product).toLocaleString()}원
      </Text>
    </VStack>
  </Host>
);

const styles = StyleSheet.create({
  host: { marginBottom: 12 },
  image: { width: '100%', height: 210, borderRadius: 14, backgroundColor: colors.canvas },
});
