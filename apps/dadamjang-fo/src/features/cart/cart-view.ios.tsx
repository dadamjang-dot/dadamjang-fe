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

import type { Cart } from './types';

type CartViewProps = {
  cart?: Cart;
  loading: boolean;
  onRemove: (skuId: string) => void;
  onChangeQuantity: (skuId: string, quantity: number) => void;
  onCheckout: () => void;
  onCheckoutFailure: () => void;
  checkoutPending: boolean;
};

export const CartView = ({
  cart,
  loading,
  onRemove,
  onChangeQuantity,
  onCheckout,
  onCheckoutFailure,
  checkoutPending,
}: CartViewProps) => {
  if (loading) return <NativeMessage title="장바구니를 불러오는 중" loading />;
  if (!cart?.items.length) return <NativeMessage title="장바구니가 비어 있어요" />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Host matchContents>
        <VStack alignment="leading" spacing={12} modifiers={[padding({ horizontal: 16, vertical: 8 })]}>
          {cart.items.map((item) => (
            <VStack
              key={item.cartItemId}
              alignment="leading"
              spacing={8}
              modifiers={[
                background(colors.surface),
                border({ color: colors.line, width: 1 }),
                cornerRadius(18),
                padding({ all: 12 }),
              ]}>
              <RNHostView matchContents>
                <Image source={item.product.imageUrls[0]} style={styles.image} contentFit="cover" />
              </RNHostView>
              <Text modifiers={[font({ size: 17, weight: 'black' }), foregroundStyle(colors.ink)]}>
                {item.product.title}
              </Text>
              <Text modifiers={[font({ size: 14 }), foregroundStyle(colors.muted)]}>
                {item.sku.optionName} / {item.quantity}개
              </Text>
              <Button
                label="수량 +"
                onPress={() => onChangeQuantity(item.sku.skuId, item.quantity + 1)}
                modifiers={[tint(colors.ink)]}
              />
              <Button
                label="수량 -"
                onPress={() => onChangeQuantity(item.sku.skuId, Math.max(item.quantity - 1, 1))}
                modifiers={[tint(colors.ink)]}
              />
              <Text modifiers={[font({ size: 19, weight: 'black' }), foregroundStyle(colors.ink)]}>
                {(item.sku.price * item.quantity).toLocaleString()}원
              </Text>
              <Button label="삭제" role="destructive" onPress={() => onRemove(item.sku.skuId)} />
            </VStack>
          ))}
          <Text modifiers={[font({ size: 24, weight: 'black' }), foregroundStyle(colors.ink)]}>
            총 {cart.totalAmount.toLocaleString()}원
          </Text>
          <Button
            label={checkoutPending ? "주문 처리 중" : "주문하기"}
            onPress={checkoutPending ? () => undefined : onCheckout}
            modifiers={[buttonStyle('borderedProminent'), tint(colors.ink)]}
          />
          <Button
            label={checkoutPending ? "결제 처리 중" : "mock 결제 실패 테스트"}
            role="destructive"
            onPress={checkoutPending ? () => undefined : onCheckoutFailure}
          />
        </VStack>
      </Host>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  image: { width: '100%', height: 180, borderRadius: 14, backgroundColor: colors.canvas },
});
