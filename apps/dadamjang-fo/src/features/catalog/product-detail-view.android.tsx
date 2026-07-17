import { Image } from 'expo-image';
import { Button, Card, Column, Host, RNHostView, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
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
        <Column verticalArrangement={{ spacedBy: 14 }} modifiers={[paddingAll(16), fillMaxWidth()]}>
         <RNHostView matchContents>
           <Image source={product.imageUrls[0]} style={styles.heroImage} contentFit="cover" />
         </RNHostView>
          <Text color={colors.muted} style={{ typography: 'labelSmall', fontWeight: 'bold' }}>DADAMJANG SELECT</Text>
          <Text style={{ typography: 'headlineMedium', fontWeight: 'bold' }} color={colors.ink}>{product.title}</Text>
          <Text color={colors.ink} style={{ typography: 'headlineSmall', fontWeight: 'bold' }}>
            {(selectedSku?.price ?? 0).toLocaleString()}원
          </Text>
          <Text color={colors.muted}>{product.description}</Text>
          <Card colors={{ containerColor: colors.surface }}>
            <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[paddingAll(14)]}>
              <Text style={{ typography: 'titleSmall', fontWeight: 'bold' }} color={colors.ink}>옵션 선택</Text>
              {product.skus.map((sku) => (
                <Button key={sku.skuId} onClick={() => onSelectSku(sku.skuId)} colors={{ containerColor: colors.primary }}>
                  <Text>
                    {selectedSku?.skuId === sku.skuId ? '✓ ' : ''}
                    {sku.optionName} · {sku.price.toLocaleString()}원 · 재고 {sku.stock}
                  </Text>
                </Button>
              ))}
            </Column>
          </Card>
          <Button onClick={onAddWish} colors={{ containerColor: colors.primary }}>
            <Text>위시템 저장</Text>
          </Button>
          <Button onClick={onAddComparison} colors={{ containerColor: colors.primary }}>
            <Text>비교함 담기</Text>
          </Button>
          <Button onClick={onAddCart} colors={{ containerColor: colors.primary }}>
            <Text>장바구니 담기</Text>
          </Button>
        </Column>
      </Host>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  heroImage: { width: '100%', height: 390, borderRadius: 18, backgroundColor: colors.canvas },
});
