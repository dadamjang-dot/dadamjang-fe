import { ScrollView, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components";
import type { StyleCategoryKey } from "../rules";

export type { StyleCategoryKey } from "../rules";

type StyleCategoryBarProps = {
  selectedCategory: StyleCategoryKey;
  onSelect: (category: StyleCategoryKey) => void;
};

const categories: { key: StyleCategoryKey; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "RANKING", label: "랭킹" },
  { key: "SNEAKERS", label: "스니커즈" },
  { key: "CLOTHING", label: "의류" },
  { key: "ACCESSORIES", label: "잡화" },
];

const StyleCategoryBar = ({
  selectedCategory,
  onSelect,
}: StyleCategoryBarProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={s.container}
    contentContainerStyle={s.content}
    contentInsetAdjustmentBehavior="automatic"
  >
    {categories.map(({ key, label }) => {
      const isSelected = key === selectedCategory;
      return (
        <Button
          key={key}
          accessibilityState={{ selected: isSelected }}
          onPress={() => onSelect(key)}
          style={[s.item, isSelected && s.selectedItem]}
          variant="bare"
        >
          <Text style={[s.label, isSelected && s.selectedLabel]}>{label}</Text>
        </Button>
      );
    })}
  </ScrollView>
);

const s = StyleSheet.create({
  container: {
    height: 48,
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  content: {
    minWidth: "100%",
    alignItems: "stretch",
    gap: 0,
    paddingHorizontal: 16,
  },
  item: {
    height: 48,
    justifyContent: "center",
    marginHorizontal: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  selectedItem: { borderBottomColor: colors.ink },
  label: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  selectedLabel: { color: colors.ink },
});

export default StyleCategoryBar;
