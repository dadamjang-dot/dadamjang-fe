import { Image } from 'expo-image';
import { Button, Host, RNHostView, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  border,
  buttonStyle,
  cornerRadius,
  font,
  foregroundStyle,
  padding,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { NativeMessage } from '@/shared/components';
import { colors } from '@dadamjang/design-tokens';

import type { Product } from './types';

type ProductDetailViewProps = {
  product?: Product;
  loading: boolean;
  selectedSkuId?: string;
  onSelectSku: (skuId: string) => void;
  onAddWish: () => void;
  onAddComparison: () => void;
  onAddCart: () => void;
};

const getSelectedSku = (product: Product, selectedSkuId?: string) =>
  product.skus.find((sku) => sku.skuId === selectedSkuId) ?? product.skus[0];

export const ProductDetailView = ({
  product,
  loading,
  selectedSkuId,
  onSelectSku,
  onAddWish,
  onAddComparison,
  onAddCart,
}: ProductDetailViewProps) => {
  if (loading) return <NativeMessage title="상품을 불러오는 중" loading />;
  if (!product) return <NativeMessage title="상품을 찾을 수 없어요" />;
  const selectedSku = getSelectedSku(product, selectedSkuId);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Host matchContents>
        <VStack alignment="leading" spacing={14} modifiers={[padding({ horizontal: 16, vertical: 12 })]}>
          <RNHostView matchContents>
            <Image source={product.imageUrls[0]} style={styles.heroImage} contentFit="cover" />
          </RNHostView>
          <Text modifiers={[font({ size: 12, weight: 'black' }), foregroundStyle(colors.muted)]}>
            DADAMJANG SELECT
          </Text>
          <Text modifiers={[font({ size: 26, weight: 'black' }), foregroundStyle(colors.ink)]}>{product.title}</Text>
          <Text modifiers={[font({ size: 24, weight: 'black' }), foregroundStyle(colors.ink)]}>
            {(selectedSku?.price ?? 0).toLocaleString()}원
          </Text>
          <Text modifiers={[font({ size: 15 }), foregroundStyle(colors.muted)]}>{product.description}</Text>
          <VStack
            spacing={8}
            modifiers={[
              background(colors.surface),
              border({ color: colors.line, width: 1 }),
              cornerRadius(18),
              padding({ all: 14 }),
            ]}>
            <Text modifiers={[font({ size: 14, weight: 'black' })]}>옵션 선택</Text>
            {product.skus.map((sku) => (
              <Button
                key={sku.skuId}
                label={`${selectedSku?.skuId === sku.skuId ? '✓ ' : ''}${sku.optionName} · ${sku.price.toLocaleString()}원 · 재고 ${sku.stock}`}
                onPress={() => onSelectSku(sku.skuId)}
                modifiers={[tint(colors.ink)]}
              />
            ))}
          </VStack>
          <Button label="위시템 저장" onPress={onAddWish} modifiers={[tint(colors.ink)]} />
          <Button label="비교함 담기" onPress={onAddComparison} modifiers={[tint(colors.ink)]} />
          <Button
            label="장바구니 담기"
            onPress={onAddCart}
            modifiers={[buttonStyle('borderedProminent'), tint(colors.ink)]}
          />
        </VStack>
      </Host>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  heroImage: { width: '100%', height: 390, borderRadius: 18, backgroundColor: colors.canvas },
});
