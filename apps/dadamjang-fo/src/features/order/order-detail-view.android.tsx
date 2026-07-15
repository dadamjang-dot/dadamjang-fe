import { Card, Column, Host, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
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
        <Column verticalArrangement={{ spacedBy: 12 }} modifiers={[paddingAll(16), fillMaxWidth()]}>
         <Card colors={{ containerColor: colors.surface }}>
           <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[paddingAll(14)]}>
              <Text style={{ typography: 'titleLarge', fontWeight: 'bold' }} color={colors.ink}>{order.orderNumber}</Text>
              <Text color={colors.muted}>
                {order.status} / {order.paymentStatus}
              </Text>
              {order.paymentFailureReason ? <Text color={colors.danger}>{order.paymentFailureReason}</Text> : null}
              <Text color={colors.ink} style={{ typography: 'headlineSmall', fontWeight: 'bold' }}>
                총 {order.totalAmount.toLocaleString()}원
              </Text>
            </Column>
          </Card>
          {order.items.map((item) => (
            <Card key={item.orderItemId} colors={{ containerColor: colors.surface }}>
              <Column verticalArrangement={{ spacedBy: 6 }} modifiers={[paddingAll(14)]}>
                <Text style={{ typography: 'titleMedium', fontWeight: 'bold' }} color={colors.ink}>{item.productTitle}</Text>
                <Text color={colors.muted}>
                  {item.skuOptionName} · {item.quantity}개
                </Text>
                <Text style={{ typography: 'titleMedium', fontWeight: 'bold' }} color={colors.ink}>
                  {(item.unitPrice * item.quantity).toLocaleString()}원
                </Text>
              </Column>
            </Card>
          ))}
        </Column>
      </Host>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
});
