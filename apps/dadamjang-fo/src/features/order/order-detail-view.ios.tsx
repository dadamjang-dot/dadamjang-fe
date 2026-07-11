import { Host, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { NativeMessage } from '@/shared/components';
import { colors } from '@dadamjang/design-tokens';

import type { Order } from './api';

type OrderDetailViewProps = {
  order?: Order;
  loading: boolean;
};

export const OrderDetailView = ({ order, loading }: OrderDetailViewProps) => {
  if (loading) return <NativeMessage title="주문 상세를 불러오는 중" loading />;
  if (!order) return <NativeMessage title="주문을 찾을 수 없어요" />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Host matchContents>
        <VStack alignment="leading" spacing={12} modifiers={[padding({ horizontal: 16, vertical: 8 })]}>
          <VStack alignment="leading" spacing={8} modifiers={[background(colors.surface), cornerRadius(18), padding({ all: 14 })]}>
            <Text modifiers={[font({ size: 20, weight: 'bold' })]}>{order.orderNumber}</Text>
            <Text modifiers={[font({ size: 14 }), foregroundStyle(colors.muted)]}>
              {order.status} / {order.paymentStatus}
            </Text>
            {order.paymentFailureReason ? (
              <Text modifiers={[font({ size: 14 }), foregroundStyle(colors.danger)]}>{order.paymentFailureReason}</Text>
            ) : null}
            <Text modifiers={[font({ size: 22, weight: 'bold' }), foregroundStyle(colors.primary)]}>
              총 {order.totalAmount.toLocaleString()}원
            </Text>
          </VStack>
          {order.items.map((item) => (
            <VStack
              key={item.orderItemId}
              alignment="leading"
              spacing={6}
              modifiers={[background(colors.surface), cornerRadius(18), padding({ all: 14 })]}>
              <Text modifiers={[font({ size: 16, weight: 'semibold' })]}>{item.productTitle}</Text>
              <Text modifiers={[font({ size: 14 }), foregroundStyle(colors.muted)]}>
                {item.skuOptionName} · {item.quantity}개
              </Text>
              <Text modifiers={[font({ size: 17, weight: 'bold' })]}>
                {(item.unitPrice * item.quantity).toLocaleString()}원
              </Text>
            </VStack>
          ))}
        </VStack>
      </Host>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
});
