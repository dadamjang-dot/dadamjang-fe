import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { colors } from '@dadamjang/design-tokens';

import {
  useCatalogFilterOptions,
  useShopFilters,
  type CatalogFilterOption,
  type ProductSort,
  type ShopFilterMode,
} from '@/features/catalog';

type ShopFilterSheetProps = {
  mode: ShopFilterMode;
  onApply: () => void;
  onCancel: () => void;
};

type SelectOption = CatalogFilterOption;

const priceRanges = [
  { id: 'all', label: '전체 가격', minPrice: undefined, maxPrice: undefined },
  { id: 'under-30000', label: '3만원 이하', minPrice: undefined, maxPrice: 30_000 },
  { id: '30000-60000', label: '3만원 - 6만원', minPrice: 30_000, maxPrice: 60_000 },
  { id: '60000-100000', label: '6만원 - 10만원', minPrice: 60_000, maxPrice: 100_000 },
  { id: 'over-100000', label: '10만원 이상', minPrice: 100_000, maxPrice: undefined },
] as const;

const sortOptions: { id: ProductSort; label: string }[] = [
  { id: 'RECOMMENDED', label: '추천순' },
  { id: 'LATEST', label: '최신순' },
  { id: 'POPULAR', label: '인기순' },
  { id: 'LOW_PRICE', label: '낮은 가격순' },
  { id: 'HIGH_PRICE', label: '높은 가격순' },
];

const optionKey = (option: SelectOption) => option.id;

const FilterOptionRow = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <Pressable
    accessibilityRole="checkbox"
    accessibilityState={{ checked: selected }}
    onPress={onPress}
    style={s.optionRow}
  >
    <Text style={s.optionLabel}>{label}</Text>
    <View style={[s.check, selected && s.selectedCheck]}>
      {selected ? <Text style={s.checkLabel}>✓</Text> : null}
    </View>
  </Pressable>
);

const toggleValue = (values: string[], value: string) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const ShopFilterSheet = ({ mode, onApply, onCancel }: ShopFilterSheetProps) => {
  const {
    data: filterOptions,
    isError: optionsError,
    isLoading: optionsLoading,
    refetch: refetchOptions,
  } = useCatalogFilterOptions();
  const { draftFilters, startDraft, updateDraft, applyDraft, cancelDraft } = useShopFilters();

  useEffect(() => {
    startDraft();
  }, [startDraft]);

  const selectedPriceId = priceRanges.find(
    (range) => range.minPrice === draftFilters.minPrice && range.maxPrice === draftFilters.maxPrice,
  )?.id;

  const handleCancel = () => {
    cancelDraft();
    onCancel();
  };

  const handleApply = () => {
    applyDraft();
    onApply();
  };

  const renderOptions = (options: SelectOption[], selectedValues: string[], onToggle: (id: string) => void) => (
    <View style={s.options}>
      {options.map((option) => (
        <FilterOptionRow
          key={optionKey(option)}
          label={option.name}
          selected={selectedValues.includes(option.id)}
          onPress={() => onToggle(option.id)}
        />
      ))}
    </View>
  );

  const renderMode = () => {
    if (mode === 'category') {
      if (optionsLoading) return <Text style={s.status}>카테고리를 불러오는 중이에요.</Text>;
      if (optionsError || !filterOptions) {
        return (
          <View style={s.statusGroup}>
            <Text style={s.status}>카테고리를 불러오지 못했어요.</Text>
            <Pressable accessibilityRole="button" onPress={() => refetchOptions()} style={s.retryButton}>
              <Text style={s.retryLabel}>다시 시도</Text>
            </Pressable>
          </View>
        );
      }

      return renderOptions(
        filterOptions.categories.map((category) => ({ id: category.categoryId, name: category.name })),
        draftFilters.categoryId ? [draftFilters.categoryId] : [],
        (categoryId) =>
          updateDraft({
            categoryId: draftFilters.categoryId === categoryId ? undefined : categoryId,
            categorySource: draftFilters.categoryId === categoryId ? undefined : 'filter',
          }),
      );
    }

    if (mode === 'brand' || mode === 'color' || mode === 'size') {
      if (optionsLoading) return <Text style={s.status}>필터 옵션을 불러오는 중이에요.</Text>;
      if (optionsError || !filterOptions) {
        return (
          <View style={s.statusGroup}>
            <Text style={s.status}>필터 옵션을 불러오지 못했어요.</Text>
            <Pressable accessibilityRole="button" onPress={() => refetchOptions()} style={s.retryButton}>
              <Text style={s.retryLabel}>다시 시도</Text>
            </Pressable>
          </View>
        );
      }

      const options =
        mode === 'brand'
          ? filterOptions.brands.map((option) => ({ id: option.brandId, name: option.name }))
          : mode === 'color'
            ? filterOptions.colors.map((option) => ({ id: option.colorId, name: option.name }))
            : filterOptions.sizes.map((option) => ({ id: option.sizeId, name: option.name }));
      const selectedValues = mode === 'brand' ? draftFilters.brandIds : mode === 'color' ? draftFilters.colorIds : draftFilters.sizeIds;
      const onToggle = (id: string) => {
        const nextValues = toggleValue(selectedValues, id);
        updateDraft(mode === 'brand' ? { brandIds: nextValues } : mode === 'color' ? { colorIds: nextValues } : { sizeIds: nextValues });
      };

      return renderOptions(options, selectedValues, onToggle);
    }

    if (mode === 'price') {
      return (
        <View style={s.options}>
          {priceRanges.map((range) => (
            <FilterOptionRow
              key={range.id}
              label={range.label}
              selected={range.id === selectedPriceId}
              onPress={() => updateDraft({ minPrice: range.minPrice, maxPrice: range.maxPrice })}
            />
          ))}
        </View>
      );
    }

    return (
      <View style={s.options}>
        {sortOptions.map((option) => (
          <FilterOptionRow
            key={option.id}
            label={option.label}
            selected={option.id === draftFilters.sort}
            onPress={() => updateDraft({ sort: option.id })}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{mode === 'sort' ? '정렬' : '필터'}</Text>
        <Pressable accessibilityRole="button" onPress={handleCancel} style={s.headerButton}>
          <Text style={s.cancelLabel}>취소</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.content} contentInsetAdjustmentBehavior="automatic">
        {mode === 'category' ? (
          <FilterOptionRow
            label="전체"
            selected={!draftFilters.categoryId}
            onPress={() => updateDraft({ categoryId: undefined, categorySource: undefined })}
          />
        ) : null}
        {renderMode()}
      </ScrollView>
      <View style={s.footer}>
        <Pressable accessibilityRole="button" onPress={handleCancel} style={s.secondaryButton}>
          <Text style={s.secondaryLabel}>취소</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={handleApply} style={s.primaryButton}>
          <Text style={s.primaryLabel}>적용하기</Text>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  headerButton: {
    paddingVertical: 8,
  },
  cancelLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    gap: 4,
    padding: 20,
    paddingBottom: 28,
  },
  options: {
    gap: 4,
  },
  optionRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.primarySoft,
  },
  optionLabel: {
    color: colors.ink,
    fontSize: 15,
  },
  check: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selectedCheck: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkLabel: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  statusGroup: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  status: {
    paddingVertical: 32,
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  retryLabel: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  primaryLabel: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ShopFilterSheet;
