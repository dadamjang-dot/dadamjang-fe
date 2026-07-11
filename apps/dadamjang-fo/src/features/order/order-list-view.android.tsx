import { Button, Card, Column, Host, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
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
        <Column verticalArrangement={{ spacedBy: 12 }} modifiers={[paddingAll(16), fillMaxWidth()]}>
          {orders.map((order) => (
            <Card key={order.orderId} colors={{ containerColor: colors.surface }}>
              <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[paddingAll(14)]}>
                <Text style={{ typography: 'titleMedium', fontWeight: 'bold' }}>{order.orderNumber}</Text>
                <Text color={colors.muted}>
                  {order.status} / {order.paymentStatus}
                </Text>
                <Text color={colors.primary} style={{ typography: 'titleLarge', fontWeight: 'bold' }}>
                  {order.totalAmount.toLocaleString()}원
                </Text>
                <Button onClick={() => onPressOrder(order.orderId)}>
                  <Text>상세 보기</Text>
                </Button>
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
