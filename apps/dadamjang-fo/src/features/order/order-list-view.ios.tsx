import { Button, Host, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { NativeMessage } from '@/shared/components';
import { colors } from '@dadamjang/design-tokens';

import type { Order } from './api';

type OrderListViewProps = {
  orders?: Order[];
  loading: boolean;
  onPressOrder: (orderId: string) => void;
};

export const OrderListView = ({ orders, loading, onPressOrder }: OrderListViewProps) => {
  if (loading) return <NativeMessage title="주문을 불러오는 중" loading />;
  if (!orders?.length) return <NativeMessage title="아직 주문이 없어요" />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Host matchContents>
        <VStack alignment="leading" spacing={12} modifiers={[padding({ horizontal: 16, vertical: 8 })]}>
          {orders.map((order) => (
            <VStack
              key={order.orderId}
              alignment="leading"
              spacing={8}
              modifiers={[background(colors.surface), cornerRadius(18), padding({ all: 14 })]}>
              <Text modifiers={[font({ size: 17, weight: 'semibold' })]}>{order.orderNumber}</Text>
              <Text modifiers={[font({ size: 14 }), foregroundStyle(colors.muted)]}>
                {order.status} / {order.paymentStatus}
              </Text>
              <Text modifiers={[font({ size: 18, weight: 'bold' }), foregroundStyle(colors.primary)]}>
                {order.totalAmount.toLocaleString()}원
              </Text>
              <Button label="상세 보기" onPress={() => onPressOrder(order.orderId)} />
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
