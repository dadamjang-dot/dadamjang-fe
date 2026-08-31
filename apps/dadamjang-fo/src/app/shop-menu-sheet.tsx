import { useRouter } from "expo-router";

import { useCategories, useShopFilters } from "@/features/catalog";
import ShopMenuSheet from "@/features/shop/components/shop-menu-sheet";

const ShopMenuSheetRoute = () => {
  const router = useRouter();
  const { data: categories = [], isError, isLoading, refetch } = useCategories();
  const { filters, updateFilters } = useShopFilters();

  const selectCategory = (categoryId?: string) => {
    updateFilters({
      categoryId,
      categoryIds: [],
      categorySource: categoryId ? "navigation" : undefined,
    });
    router.back();
  };

  return (
    <ShopMenuSheet
      categories={categories}
      isError={isError}
      isLoading={isLoading}
      selectedCategoryId={filters.categoryId}
      onOpenComparison={() => router.replace("/compare")}
      onRetry={() => refetch()}
      onSelectCategory={selectCategory}
    />
  );
};

export default ShopMenuSheetRoute;
