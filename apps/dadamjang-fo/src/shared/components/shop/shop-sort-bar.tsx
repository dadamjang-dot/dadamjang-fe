import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { colors } from '@dadamjang/design-tokens';

import type { ProductSort } from '@/features/catalog';

type ShopSortBarProps = {
  totalCount: number;
  sort: ProductSort;
  onOpenSort: () => void;
};

const sortLabels: Record<ProductSort, string> = {
  RECOMMENDED: '추천순',
  LATEST: '최신순',
  LOW_PRICE: '낮은 가격순',
  HIGH_PRICE: '높은 가격순',
  POPULAR: '인기순',
};

const ShopSortBar = ({ totalCount, sort, onOpenSort }: ShopSortBarProps) => (
  <View style={s.container}>
    <Text style={s.count}>{totalCount.toLocaleString('ko-KR')}개</Text>
    <Pressable accessibilityRole="button" onPress={onOpenSort} style={s.sortButton}>
      <Text style={s.sortLabel}>{sortLabels[sort]}</Text>
      <Text style={s.chevron}>⌄</Text>
    </Pressable>
  </View>
);

const s = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  count: {
    color: colors.ink,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  sortLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: {
    color: colors.muted,
    fontSize: 18,
    lineHeight: 16,
  },
});

export default ShopSortBar;
