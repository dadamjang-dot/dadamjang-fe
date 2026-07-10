import { Image } from 'expo-image';
import { Button, Card, Column, Host, RNHostView, Text, TextButton } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { NativeMessage } from '@/shared/components';
import { colors } from '@dadamjang/design-tokens';

import type { Cart } from './api';

type CartViewProps = {
  cart?: Cart;
  loading: boolean;
  onRemove: (skuId: string) => void;
  onCheckout: () => void;
};

export const CartView = ({ cart, loading, onRemove, onCheckout }: CartViewProps) => {
  if (loading) return <NativeMessage title="장바구니를 불러오는 중" loading />;
  if (!cart?.items.length) return <NativeMessage title="장바구니가 비어 있어요" />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Host matchContents>
        <Column verticalArrangement={{ spacedBy: 12 }} modifiers={[paddingAll(16), fillMaxWidth()]}>
          {cart.items.map((item) => (
            <Card key={item.cartItemId} colors={{ containerColor: colors.surface }}>
              <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[paddingAll(12)]}>
                <RNHostView matchContents>
                  <Image source={item.product.imageUrls[0]} style={styles.image} contentFit="cover" />
                </RNHostView>
                <Text style={{ typography: 'titleMedium', fontWeight: 'bold' }}>{item.product.title}</Text>
                <Text color={colors.muted}>
                  {item.sku.optionName} / {item.quantity}개
                </Text>
                <Text color={colors.primary} style={{ typography: 'titleLarge', fontWeight: 'bold' }}>
                  {(item.sku.price * item.quantity).toLocaleString()}원
                </Text>
                <TextButton onClick={() => onRemove(item.sku.skuId)}>
                  <Text>삭제</Text>
                </TextButton>
              </Column>
            </Card>
          ))}
          <Text style={{ typography: 'headlineSmall', fontWeight: 'bold' }}>
            총 {cart.totalAmount.toLocaleString()}원
          </Text>
          <Button onClick={onCheckout} colors={{ containerColor: colors.primary }}>
            <Text>주문하기</Text>
          </Button>
        </Column>
      </Host>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  image: { width: '100%', height: 180, borderRadius: 14, backgroundColor: colors.canvas },
});
