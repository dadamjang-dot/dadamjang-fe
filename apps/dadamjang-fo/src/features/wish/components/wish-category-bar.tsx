import { ScrollView, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components";
import type { WishTab } from "../types";

const tabs: { key: WishTab; label: string }[] = [
  { key: "PRODUCTS", label: "상품" },
  { key: "STYLES", label: "스타일" },
  { key: "BRANDS", label: "브랜드" },
  { key: "RECENT", label: "최근 본 상품" },
];

type WishCategoryBarProps = {
  selectedTab: WishTab;
  onSelect: (tab: WishTab) => void;
};

const WishCategoryBar = ({ selectedTab, onSelect }: WishCategoryBarProps) => (
  <ScrollView
    contentContainerStyle={s.content}
    contentInsetAdjustmentBehavior="automatic"
    horizontal
    showsHorizontalScrollIndicator={false}
    style={s.container}
  >
    {tabs.map(({ key, label }) => {
      const isSelected = key === selectedTab;
      return (
        <Button
          accessibilityState={{ selected: isSelected }}
          key={key}
          onPress={() => onSelect(key)}
          style={[s.item, isSelected && s.selectedItem]}
          testID={`e2e.wish.tab.${key.toLowerCase()}`}
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

export default WishCategoryBar;
