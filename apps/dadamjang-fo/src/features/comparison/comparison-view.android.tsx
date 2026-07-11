import { Column, Host } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
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
        <Column verticalArrangement={{ spacedBy: 12 }} modifiers={[paddingAll(16), fillMaxWidth()]}>
          {items.map((item) => (
            <PriceSummaryCard
              key={item.productId}
              summary={item}
              onPress={() => undefined}
              onRemove={onRemove}
            />
          ))}
        </Column>
      </Host>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
});
