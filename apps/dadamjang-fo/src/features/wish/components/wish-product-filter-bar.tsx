import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components";
import type { WishProductFilters } from "../types";

const sortLabels: Record<WishProductFilters["sort"], string> = {
  RECOMMENDED: "추천순",
  LATEST: "최신순",
  LOW_PRICE: "낮은 가격순",
  HIGH_PRICE: "높은 가격순",
};

type WishProductFilterBarProps = {
  filters: WishProductFilters;
  onOpenSort: () => void;
  onToggleSale: () => void;
  onToggleSoldOut: () => void;
};

type ToggleChipProps = {
  active: boolean;
  label: string;
  onPress: () => void;
  testID: string;
};

const ToggleChip = ({ active, label, onPress, testID }: ToggleChipProps) => (
  <Button
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={[s.chip, active && s.activeChip]}
    testID={testID}
    variant="bare"
  >
    <Text style={[s.chipLabel, active && s.activeChipLabel]}>{label}</Text>
  </Button>
);

const WishProductFilterBar = ({
  filters,
  onOpenSort,
  onToggleSale,
  onToggleSoldOut,
}: WishProductFilterBarProps) => (
  <View style={s.container}>
    <View style={s.chips}>
      <ToggleChip
        active={filters.saleOnly}
        label="슈퍼세일"
        onPress={onToggleSale}
        testID="e2e.wish.filter.sale"
      />
      <ToggleChip
        active={filters.excludeSoldOut}
        label="품절 제외"
        onPress={onToggleSoldOut}
        testID="e2e.wish.filter.sold-out"
      />
    </View>
    <Button
      onPress={onOpenSort}
      style={s.sortButton}
      testID="e2e.wish.sort.open"
      variant="bare"
    >
      <Text style={s.sortLabel}>{sortLabels[filters.sort]}</Text>
      <Text style={s.chevron}>⌄</Text>
    </Button>
  </View>
);

const s = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  chips: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  chip: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  activeChip: { borderColor: colors.ink, backgroundColor: colors.ink },
  chipLabel: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  activeChipLabel: { color: colors.surface },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  sortLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  chevron: { color: colors.muted, fontSize: 18, lineHeight: 16 },
});

export default WishProductFilterBar;
