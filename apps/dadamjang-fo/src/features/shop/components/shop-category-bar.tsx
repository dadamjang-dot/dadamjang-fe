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
  content: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  item: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
  },
  selectedItem: {
    backgroundColor: colors.primary,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  selectedLabel: {
    color: colors.surface,
  },
});

export default ShopCategoryBar;
