import { Image } from 'expo-image';
import { Button, Card, Column, Host, RNHostView, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { NativeMessage } from '@/shared/components';
import { colors } from '@/theme/tokens';

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
        <Column verticalArrangement={{ spacedBy: 14 }} modifiers={[paddingAll(16), fillMaxWidth()]}>
          <RNHostView matchContents>
            <Image source={product.imageUrls[0]} style={styles.heroImage} contentFit="cover" />
          </RNHostView>
          <Text style={{ typography: 'headlineMedium', fontWeight: 'bold' }}>{product.title}</Text>
          <Text color={colors.primary} style={{ typography: 'headlineSmall', fontWeight: 'bold' }}>
            {getPrice(product).toLocaleString()}원
          </Text>
          <Text color={colors.muted}>{product.description}</Text>
          <Card colors={{ containerColor: colors.primarySoft }}>
            <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[paddingAll(14)]}>
              <Text style={{ typography: 'titleSmall', fontWeight: 'bold' }}>옵션</Text>
              <Text color={colors.muted}>{product.skus[0]?.optionName ?? '기본 옵션'}</Text>
            </Column>
          </Card>
          <Button onClick={onAddWishlist} colors={{ containerColor: colors.primary }}>
            <Text>위시템 저장</Text>
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
  heroImage: { width: '100%', height: 360, borderRadius: 20, backgroundColor: colors.canvas },
});
