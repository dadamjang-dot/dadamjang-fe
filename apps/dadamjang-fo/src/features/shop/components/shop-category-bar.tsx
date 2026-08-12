import { Pressable, ScrollView, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import type { Category } from "@/features/catalog";

type ShopCategoryBarProps = {
  categories: Category[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId?: string) => void;
};

const ShopCategoryBar = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: ShopCategoryBarProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={s.container}
    contentContainerStyle={s.content}
    contentInsetAdjustmentBehavior="automatic"
  >
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: selectedCategoryId === undefined }}
      onPress={() => onSelectCategory(undefined)}
      style={[s.item, selectedCategoryId === undefined && s.selectedItem]}
    >
      <Text
        style={[s.label, selectedCategoryId === undefined && s.selectedLabel]}
      >
        전체
      </Text>
    </Pressable>
    {categories
      .filter((category) => category.parentId === null)
      .map((category) => {
        const isSelected = category.categoryId === selectedCategoryId;

        return (
          <Pressable
            key={category.categoryId}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelectCategory(category.categoryId)}
            style={[s.item, isSelected && s.selectedItem]}
          >
            <Text style={[s.label, isSelected && s.selectedLabel]}>
              {category.name}
            </Text>
          </Pressable>
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
  selectedItem: {
    borderBottomColor: colors.ink,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  selectedLabel: {
    color: colors.ink,
  },
});

export default ShopCategoryBar;
