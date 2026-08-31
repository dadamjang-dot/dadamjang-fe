import { type ReactElement } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import type { Category } from "@/features/catalog";
import { Button } from "@/shared/components/button";

export interface ShopMenuSheetProps {
  categories: readonly Category[];
  isError: boolean;
  isLoading: boolean;
  selectedCategoryId?: string;
  onOpenComparison: () => void;
  onRetry: () => void;
  onSelectCategory: (categoryId?: string) => void;
}

const ShopMenuSheet = ({
  categories,
  isError,
  isLoading,
  selectedCategoryId,
  onOpenComparison,
  onRetry,
  onSelectCategory,
}: ShopMenuSheetProps) => {
  if (isLoading) {
    return (
      <View style={s.state}>
        <ActivityIndicator color={colors.primary} />
        <Text style={s.stateDescription}>카테고리를 불러오는 중이에요.</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.state}>
        <Text style={s.stateTitle}>카테고리를 불러오지 못했어요.</Text>
        <Text style={s.stateDescription}>잠시 후 다시 시도해 주세요.</Text>
        <Button label="다시 시도" onPress={onRetry} style={s.retryButton} />
      </View>
    );
  }

  const categoriesByParentId = new Map<string | null, Category[]>();
  categories.forEach((category) => {
    const siblings = categoriesByParentId.get(category.parentId) ?? [];
    siblings.push(category);
    categoriesByParentId.set(category.parentId, siblings);
  });
  categoriesByParentId.forEach((siblings) =>
    siblings.sort((left, right) => left.sortOrder - right.sortOrder),
  );

  const renderCategories = (
    parentId: string | null,
    level = 0,
  ): ReactElement[] =>
    (categoriesByParentId.get(parentId) ?? []).flatMap((category) => [
      <Button
        accessibilityLabel={category.name}
        accessibilityState={{ selected: category.categoryId === selectedCategoryId }}
        key={category.categoryId}
        onPress={() => onSelectCategory(category.categoryId)}
        style={[s.category, level > 0 && s.childCategory]}
        variant="bare"
      >
        <Text
          style={[
            s.categoryLabel,
            category.categoryId === selectedCategoryId && s.selectedCategoryLabel,
          ]}
        >
          {category.name}
        </Text>
      </Button>,
      ...renderCategories(category.categoryId, level + 1),
    ]);

  return (
    <ScrollView contentContainerStyle={s.content} style={s.container}>
      <View style={s.categories}>
        <Button
          accessibilityLabel="전체"
          accessibilityState={{ selected: selectedCategoryId === undefined }}
          onPress={() => onSelectCategory(undefined)}
          style={s.category}
          variant="bare"
        >
          <Text
            style={[
              s.categoryLabel,
              selectedCategoryId === undefined && s.selectedCategoryLabel,
            ]}
          >
            전체
          </Text>
        </Button>
        {renderCategories(null)}
      </View>
      <Button label="비교함" onPress={onOpenComparison} style={s.comparison} />
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    gap: 20,
    padding: 20,
    paddingBottom: 28,
  },
  categories: {
    borderTopWidth: 1,
    borderTopColor: colors.primarySoft,
  },
  category: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.primarySoft,
  },
  childCategory: {
    paddingLeft: 24,
  },
  categoryLabel: {
    color: colors.ink,
    fontSize: 15,
  },
  selectedCategoryLabel: {
    color: colors.primary,
    fontWeight: "700",
  },
  comparison: {
    minHeight: 48,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
    backgroundColor: colors.surface,
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  stateDescription: {
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

export default ShopMenuSheet;
