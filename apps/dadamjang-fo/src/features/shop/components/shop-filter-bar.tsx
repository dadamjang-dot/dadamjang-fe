import { ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import type { ShopFilterMode, ShopFilters } from "@/features/catalog";
import { Button } from "@/shared/components";

type ShopFilterBarProps = {
  filters: ShopFilters;
  onOpenFilter: (mode: Exclude<ShopFilterMode, "sort">) => void;
  onToggleSale?: (value: boolean) => void;
  onToggleExpress?: (value: boolean) => void;
  selectedMode?: ShopFilterMode;
  variant?: "mini";
};

type FilterChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
  mini?: boolean;
  showDisclosure?: boolean;
  testID: string;
};

const FilterChip = ({
  label,
  active,
  onPress,
  mini,
  showDisclosure,
  testID,
}: FilterChipProps) => (
  <Button
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={[
      s.chip,
      mini && s.miniChip,
      !mini && active && s.activeChip,
      mini && active && s.miniActiveChip,
    ]}
    testID={testID}
    variant="bare"
  >
    <Text
      style={[
        s.chipLabel,
        mini && s.miniChipLabel,
        !mini && active && s.activeChipLabel,
        mini && active && s.miniActiveChipLabel,
      ]}
    >
      {label}
    </Text>
    {showDisclosure ? <Text style={s.disclosureIcon}>⌄</Text> : null}
  </Button>
);

const ShopFilterBar = ({
  filters,
  onOpenFilter,
  onToggleSale,
  onToggleExpress,
  selectedMode,
  variant,
}: ShopFilterBarProps) => {
  const isMini = variant === "mini";
  const chips = (
    <>
      {!isMini && onToggleSale && onToggleExpress ? (
        <>
          <FilterChip
            label="슈퍼세일"
            active={filters.saleOnly}
            onPress={() => onToggleSale(!filters.saleOnly)}
            testID="e2e.filter.toggle.sale"
          />
          <FilterChip
            label="바로배송"
            active={filters.expressOnly}
            onPress={() => onToggleExpress(!filters.expressOnly)}
            testID="e2e.filter.toggle.express"
          />
        </>
      ) : null}
      <FilterChip
        label="카테고리"
        mini={isMini}
        showDisclosure={!isMini}
        active={isMini ? selectedMode === "category" : false}
        onPress={() => onOpenFilter("category")}
        testID="e2e.filter.open.category"
      />
      <FilterChip
        label="브랜드"
        mini={isMini}
        showDisclosure={!isMini}
        active={isMini ? selectedMode === "brand" : false}
        onPress={() => onOpenFilter("brand")}
        testID="e2e.filter.open.brand"
      />
      <FilterChip
        label="색상"
        mini={isMini}
        showDisclosure={!isMini}
        active={isMini ? selectedMode === "color" : false}
        onPress={() => onOpenFilter("color")}
        testID="e2e.filter.open.color"
      />
      <FilterChip
        label="사이즈"
        mini={isMini}
        showDisclosure={!isMini}
        active={isMini ? selectedMode === "size" : false}
        onPress={() => onOpenFilter("size")}
        testID="e2e.filter.open.size"
      />
      <FilterChip
        label="가격대"
        mini={isMini}
        showDisclosure={!isMini}
        active={isMini ? selectedMode === "price" : false}
        onPress={() => onOpenFilter("price")}
        testID="e2e.filter.open.price"
      />
    </>
  );

  return (
    <View style={[s.container, isMini && s.miniContainer]}>
      {isMini ? (
        <View style={s.miniTabs}>{chips}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
          contentInsetAdjustmentBehavior="automatic"
        >
          {chips}
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingTop: 12,
  },
  miniContainer: {
    paddingTop: 24,
  },
  miniTabs: {
    height: 40,
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  chip: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  miniChip: {
    flex: 1,
    height: 40,
    minHeight: 0,
    marginHorizontal: 4,
    paddingHorizontal: 4,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    backgroundColor: colors.surface,
  },
  disclosureIcon: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 16,
  },
  activeChip: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  miniActiveChip: {
    marginBottom: -1,
    zIndex: 1,
    borderBottomColor: colors.ink,
  },
  chipLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600",
  },
  miniChipLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  miniActiveChipLabel: {
    color: colors.ink,
  },
  activeChipLabel: {
    color: colors.surface,
  },
});

export default ShopFilterBar;
