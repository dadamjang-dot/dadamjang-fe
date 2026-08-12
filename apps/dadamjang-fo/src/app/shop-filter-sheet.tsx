import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import {
  toProductFilter,
  useCatalogFilterOptions,
  useShopFilters,
  type CatalogFilterOption,
  type ShopFilterMode,
} from "@/features/catalog";
import { useProductPriceSummaries } from "@/features/price-evidence";
import { Button } from "@/shared/components";
import {
  ProductFilterSheet,
  ShopFilterBar,
} from "@/features/shop";

type FilterMode = Exclude<ShopFilterMode, "sort">;

const filterModes: FilterMode[] = [
  "category",
  "brand",
  "color",
  "size",
  "price",
];

const isFilterMode = (
  value: string | string[] | undefined,
): value is FilterMode =>
  typeof value === "string" && filterModes.includes(value as FilterMode);

type SelectOption = CatalogFilterOption;

const priceRanges = [
  { id: "all", label: "전체 가격", minPrice: undefined, maxPrice: undefined },
  {
    id: "under-30000",
    label: "3만원 이하",
    minPrice: undefined,
    maxPrice: 30_000,
  },
  {
    id: "30000-60000",
    label: "3만원 - 6만원",
    minPrice: 30_000,
    maxPrice: 60_000,
  },
  {
    id: "60000-100000",
    label: "6만원 - 10만원",
    minPrice: 60_000,
    maxPrice: 100_000,
  },
  {
    id: "over-100000",
    label: "10만원 이상",
    minPrice: 100_000,
    maxPrice: undefined,
  },
] as const;

const optionKey = (option: SelectOption) => option.id;

const FilterOptionRow = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Button
    accessibilityRole="checkbox"
    accessibilityLabel={label}
    accessibilityState={{ checked: selected }}
    onPress={onPress}
    style={s.optionRow}
    variant="bare"
  >
    <Text style={s.optionLabel}>{label}</Text>
    <View style={[s.check, selected && s.selectedCheck]}>
      {selected ? <Text style={s.checkLabel}>✓</Text> : null}
    </View>
  </Button>
);

const CategoryOptionLabel = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Button
    accessibilityLabel={label}
    accessibilityState={{ selected }}
    onPress={onPress}
    style={[s.categoryOption, selected && s.selectedCategoryOption]}
    variant="bare"
  >
    <Text
      style={[
        s.categoryOptionLabel,
        selected && s.selectedCategoryOptionLabel,
      ]}
    >
      {label}
    </Text>
  </Button>
);

const toggleValue = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

const FilterContent = ({ mode }: { mode: FilterMode }) => {
  const {
    data: filterOptions,
    isError: optionsError,
    isLoading: optionsLoading,
    refetch: refetchOptions,
  } = useCatalogFilterOptions();
  const { draftFilters, updateDraft } = useShopFilters();

  const selectedPriceId = priceRanges.find(
    (range) =>
      range.minPrice === draftFilters.minPrice &&
      range.maxPrice === draftFilters.maxPrice,
  )?.id;

  const renderOptions = (
    options: SelectOption[],
    selectedValues: string[],
    onToggle: (id: string) => void,
  ) => (
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

  if (mode === "category") {
    if (optionsLoading)
      return <Text style={s.status}>카테고리를 불러오는 중이에요.</Text>;
    if (optionsError || !filterOptions) {
      return (
        <View style={s.statusGroup}>
          <Text style={s.status}>카테고리를 불러오지 못했어요.</Text>
          <Button
            label="다시 시도"
            onPress={() => refetchOptions()}
            style={s.retryButton}
          />
        </View>
      );
    }

    const selectedCategoryIds =
      draftFilters.categoryIds?.length > 0
        ? draftFilters.categoryIds
        : draftFilters.categoryId
          ? [draftFilters.categoryId]
          : [];

    const toggleCategory = (categoryId: string) => {
      const categoryIds = toggleValue(selectedCategoryIds, categoryId);

      updateDraft({
        categoryId: undefined,
        categoryIds,
        categorySource: categoryIds.length > 0 ? "filter" : undefined,
      });
    };

    return (
      <View style={s.categoryOptions}>
        {filterOptions.categories.map((category) => (
          <CategoryOptionLabel
            key={category.categoryId}
            label={category.name}
            selected={selectedCategoryIds.includes(category.categoryId)}
            onPress={() => toggleCategory(category.categoryId)}
          />
        ))}
      </View>
    );
  }

  if (mode === "brand" || mode === "color" || mode === "size") {
    if (optionsLoading)
      return <Text style={s.status}>필터 옵션을 불러오는 중이에요.</Text>;
    if (optionsError || !filterOptions) {
      return (
        <View style={s.statusGroup}>
          <Text style={s.status}>필터 옵션을 불러오지 못했어요.</Text>
          <Button
            label="다시 시도"
            onPress={() => refetchOptions()}
            style={s.retryButton}
          />
        </View>
      );
    }

    const options =
      mode === "brand"
        ? filterOptions.brands.map((option) => ({
            id: option.brandId,
            name: option.name,
          }))
        : mode === "color"
          ? filterOptions.colors.map((option) => ({
              id: option.colorId,
              name: option.name,
            }))
          : filterOptions.sizes.map((option) => ({
              id: option.sizeId,
              name: option.name,
            }));
    const selectedValues =
      mode === "brand"
        ? draftFilters.brandIds
        : mode === "color"
          ? draftFilters.colorIds
          : draftFilters.sizeIds;
    const onToggle = (id: string) => {
      const nextValues = toggleValue(selectedValues, id);
      updateDraft(
        mode === "brand"
          ? { brandIds: nextValues }
          : mode === "color"
            ? { colorIds: nextValues }
            : { sizeIds: nextValues },
      );
    };

    return renderOptions(options, selectedValues, onToggle);
  }

  if (mode === "price") {
    return (
      <View style={s.options}>
        {priceRanges.map((range) => (
          <FilterOptionRow
            key={range.id}
            label={range.label}
            selected={range.id === selectedPriceId}
            onPress={() =>
              updateDraft({
                minPrice: range.minPrice,
                maxPrice: range.maxPrice,
              })
            }
          />
        ))}
      </View>
    );
  }

  return null;
};

const ShopFilterSheetRoute = () => {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const filterMode = isFilterMode(mode) ? mode : "category";
  const { startDraft, updateDraft, applyDraft, draftFilters } = useShopFilters();
  const draftProductFilter = useMemo(
    () => toProductFilter(draftFilters),
    [draftFilters],
  );
  const draftProductsQuery = useProductPriceSummaries(draftProductFilter);
  const totalCount = draftProductsQuery.data?.pages[0]?.totalCount ?? 0;

  useEffect(() => {
    startDraft();
  }, [startDraft]);

  const handleReset = () => {
    updateDraft({
      categoryId: undefined,
      categoryIds: [],
      categorySource: undefined,
      brandIds: [],
      colorIds: [],
      sizeIds: [],
      saleOnly: false,
      expressOnly: false,
      minPrice: undefined,
      maxPrice: undefined,
    });
  };

  const handleViewProducts = () => {
    applyDraft();
    router.back();
  };

  return (
    <ProductFilterSheet
      filterBar={
        <ShopFilterBar
          filters={draftFilters}
          onOpenFilter={(nextMode) => router.setParams({ mode: nextMode })}
          selectedMode={filterMode}
          variant="mini"
        />
      }
      totalCount={totalCount}
      onReset={handleReset}
      onViewProducts={handleViewProducts}
    >
      <FilterContent mode={filterMode} />
    </ProductFilterSheet>
  );
};

const s = StyleSheet.create({
  options: {
    gap: 4,
  },
  categoryOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 8,
  },
  categoryOption: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  selectedCategoryOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  categoryOptionLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600",
  },
  selectedCategoryOptionLabel: {
    color: colors.surface,
  },
  optionRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "700",
  },
  statusGroup: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 32,
  },
  status: {
    paddingVertical: 32,
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
});

export default ShopFilterSheetRoute;
