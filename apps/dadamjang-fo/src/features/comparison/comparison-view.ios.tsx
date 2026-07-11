import { Host, VStack } from '@expo/ui/swift-ui';
import { padding } from '@expo/ui/swift-ui/modifiers';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { PriceSummaryCard } from '@/features/price-evidence';
import { NativeMessage } from '@/shared/components';

import type { ProductPriceSummary } from '@/features/price-evidence';

type ComparisonViewProps = {
  items?: ProductPriceSummary[];
  loading: boolean;
  onRemove: (productId: string) => void;
};

export const ComparisonView = ({ items, loading, onRemove }: ComparisonViewProps) => {
  if (loading) return <NativeMessage title="비교함을 불러오는 중" loading />;
  if (!items?.length) return <NativeMessage title="비교할 위시템이 없어요" />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Host matchContents>
        <VStack alignment="leading" spacing={12} modifiers={[padding({ horizontal: 16, vertical: 8 })]}>
          {items.map((item) => (
            <PriceSummaryCard
              key={item.productId}
              summary={item}
              onPress={() => undefined}
              onRemove={onRemove}
            />
          ))}
        </VStack>
      </Host>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
});
