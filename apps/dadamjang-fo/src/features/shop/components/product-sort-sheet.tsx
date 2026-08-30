import { ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import type { ProductSort } from "@/features/catalog";
import { Button } from "@/shared/components/button";

const sortOptions: { id: ProductSort; label: string }[] = [
  { id: "RECOMMENDED", label: "추천순" },
  { id: "LATEST", label: "최신순" },
  { id: "POPULAR", label: "인기순" },
  { id: "LOW_PRICE", label: "낮은 가격순" },
  { id: "HIGH_PRICE", label: "높은 가격순" },
];

type ProductSortSheetProps = {
  selectedSort: ProductSort;
  onSelect: (sort: ProductSort) => void;
};

const ProductSortSheet = ({
  selectedSort,
  onSelect,
}: ProductSortSheetProps) => (
  <ScrollView
    contentContainerStyle={s.content}
    contentInsetAdjustmentBehavior="automatic"
    style={s.container}
  >
    <View style={s.options}>
      {sortOptions.map((option) => (
        <Button
          accessibilityRole="checkbox"
          accessibilityState={{ checked: option.id === selectedSort }}
          key={option.id}
          onPress={() => onSelect(option.id)}
          style={s.optionRow}
          testID={`e2e.filter.sort.${option.id.toLowerCase()}`}
          variant="bare"
        >
          <Text style={s.optionLabel}>{option.label}</Text>
          <View
            style={[s.check, option.id === selectedSort && s.selectedCheck]}
          >
            {option.id === selectedSort ? (
              <Text style={s.checkLabel}>✓</Text>
            ) : null}
          </View>
        </Button>
      ))}
    </View>
  </ScrollView>
);

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
});

export default ProductSortSheet;
