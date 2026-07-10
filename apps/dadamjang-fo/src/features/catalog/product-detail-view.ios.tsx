import { Image } from 'expo-image';
import { Button, Host, RNHostView, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { NativeMessage } from '@/shared/components';
import { colors } from '@dadamjang/design-tokens';

import type { Product } from './types';

type ProductDetailViewProps = {
  product?: Product;
  loading: boolean;
  onAddWishlist: () => void;
  onAddCart: () => void;
};

const getPrice = (product: Product) => product.skus[0]?.price ?? 0;

export const ProductDetailView = ({
  product,
  loading,
  onAddWishlist,
  onAddCart,
}: ProductDetailViewProps) => {
  if (loading) return <NativeMessage title="상품을 불러오는 중" loading />;
  if (!product) return <NativeMessage title="상품을 찾을 수 없어요" />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Host matchContents>
        <VStack alignment="leading" spacing={14} modifiers={[padding({ horizontal: 16, vertical: 12 })]}>
          <RNHostView matchContents>
            <Image source={product.imageUrls[0]} style={styles.heroImage} contentFit="cover" />
          </RNHostView>
          <Text modifiers={[font({ size: 28, weight: 'bold' })]}>{product.title}</Text>
          <Text modifiers={[font({ size: 22, weight: 'bold' }), foregroundStyle(colors.primary)]}>
            {getPrice(product).toLocaleString()}원
          </Text>
          <Text modifiers={[font({ size: 15 }), foregroundStyle(colors.muted)]}>{product.description}</Text>
          <VStack spacing={8} modifiers={[background(colors.primarySoft), cornerRadius(16), padding({ all: 14 })]}>
            <Text modifiers={[font({ size: 14, weight: 'semibold' })]}>옵션</Text>
            <Text modifiers={[font({ size: 14 }), foregroundStyle(colors.muted)]}>
              {product.skus[0]?.optionName ?? '기본 옵션'}
            </Text>
          </VStack>
          <Button label="위시템 저장" onPress={onAddWishlist} />
          <Button label="장바구니 담기" onPress={onAddCart} />
        </VStack>
      </Host>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  heroImage: { width: '100%', height: 360, borderRadius: 20, backgroundColor: colors.canvas },
});
