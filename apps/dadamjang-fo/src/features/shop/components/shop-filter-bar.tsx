import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import type { ShopFilterMode, ShopFilters } from "@/features/catalog";

type ShopFilterBarProps = {
  filters: ShopFilters;
  onOpenFilter: (mode: ShopFilterMode) => void;
  onToggleSale: (value: boolean) => void;
  onToggleExpress: (value: boolean) => void;
};

type FilterChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

const FilterChip = ({ label, active, onPress }: FilterChipProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={[s.chip, active && s.activeChip]}
  >
    <Text style={[s.chipLabel, active && s.activeChipLabel]}>{label}</Text>
  </Pressable>
);

const ShopFilterBar = ({
  filters,
  onOpenFilter,
  onToggleSale,
  onToggleExpress,
}: ShopFilterBarProps) => (
  <View style={s.container}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.chips}
      contentInsetAdjustmentBehavior="automatic"
    >
      <FilterChip
        label="슈퍼세일"
        active={filters.saleOnly}
        onPress={() => onToggleSale(!filters.saleOnly)}
      />
      <FilterChip
        label="바로배송"
        active={filters.expressOnly}
        onPress={() => onToggleExpress(!filters.expressOnly)}
      />
      <FilterChip
        label="카테고리"
        active={
          filters.categorySource === "filter" && Boolean(filters.categoryId)
        }
        onPress={() => onOpenFilter("category")}
      />
      <FilterChip
        label="브랜드"
        active={filters.brandIds.length > 0}
        onPress={() => onOpenFilter("brand")}
      />
      <FilterChip
        label="색상"
        active={filters.colorIds.length > 0}
        onPress={() => onOpenFilter("color")}
      />
      <FilterChip
        label="사이즈"
        active={filters.sizeIds.length > 0}
        onPress={() => onOpenFilter("size")}
      />
      <FilterChip
        label="가격대"
        active={
          filters.minPrice !== undefined || filters.maxPrice !== undefined
        }
        onPress={() => onOpenFilter("price")}
      />
    </ScrollView>
  </View>
);

const s = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  chip: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  activeChip: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600",
  },
  activeChipLabel: {
    color: colors.surface,
  },
});

export default ShopFilterBar;
