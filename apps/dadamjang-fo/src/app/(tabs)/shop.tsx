import { useRouter } from "expo-router";
import { startTransition, useMemo, useOptimistic } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { useCurrentUser } from "@/features/auth";
import {
  toProductFilter,
  useCategories,
  useShopFilters,
} from "@/features/catalog";
import { useProductPriceSummaries } from "@/features/price-evidence";
import {
  ShopCategoryBar,
  ShopFilterBar,
  ShopProductGrid,
  ShopSortBar,
} from "@/features/shop";
import { useWishActions, useWishlist } from "@/features/wish";
import { ProductLayout } from "@/shared/components";
import { Action } from "@dadamjang/mobile";

const ShopScreen = () => {
  const router = useRouter();
  const { filters, updateFilters, startDraft } = useShopFilters();
  const { data: categories = [] } = useCategories();
  const { data: currentUser } = useCurrentUser();
  const { data: wishlist = [] } = useWishlist(Boolean(currentUser));
  const { add: addWish, remove: removeWish } = useWishActions();
  const likedProductIds = useMemo(
    () => new Set(wishlist.map((item) => item.productId)),
    [wishlist],
  );
  const [optimisticLikedProductIds, updateOptimisticLike] = useOptimistic(
    likedProductIds,
    (current, { productId, liked }: { productId: string; liked: boolean }) => {
      const next = new Set(current);
      if (liked) next.add(productId);
      else next.delete(productId);
      return next;
    },
  );
  const productFilter = useMemo(() => toProductFilter(filters), [filters]);
  const productsQuery = useProductPriceSummaries(productFilter);
  const products =
    productsQuery.data?.pages.flatMap((page) => page.nodes) ?? [];
  const totalCount = productsQuery.data?.pages[0]?.totalCount ?? 0;

  const openFilter = (
    mode: "category" | "brand" | "color" | "size" | "price",
  ) => {
    startDraft();
    router.push({
      pathname: "/shop-filter-sheet",
      params: { mode },
    });
  };

  const headerActions: Action[] = [
    { icon: "line.3.horizontal", onPress: () => {} },
    { icon: "cart", onPress: () => {} },
  ];

  const handleToggleLike = (productId: string, nextLiked: boolean) => {
    if (!currentUser) return;
    const mutation = nextLiked ? addWish : removeWish;
    startTransition(async () => {
      updateOptimisticLike({ productId, liked: nextLiked });
      try {
        await mutation.mutateAsync(productId);
      } catch {}
    });
  };

  return (
    <ProductLayout headerActions={headerActions} variant="capsule">
      <View style={s.content}>
        <ShopProductGrid
          categoryBar={
            <ShopCategoryBar
              categories={categories}
              selectedCategoryId={filters.categoryId}
              onSelectCategory={(categoryId) =>
                updateFilters({
                  categoryId,
                  categoryIds: [],
                  categorySource: categoryId ? "navigation" : undefined,
                })
              }
            />
          }
          filterBar={
            <ShopFilterBar
              filters={filters}
              onOpenFilter={openFilter}
              onToggleExpress={(expressOnly) => updateFilters({ expressOnly })}
              onToggleSale={(saleOnly) => updateFilters({ saleOnly })}
            />
          }
          hasNextPage={Boolean(productsQuery.hasNextPage)}
          isError={productsQuery.isError}
          isFetchingNextPage={productsQuery.isFetchingNextPage}
          isLoading={productsQuery.isLoading}
          likedProductIds={optimisticLikedProductIds}
          onLoadMore={() => productsQuery.fetchNextPage()}
          onProductPress={(productId) => router.push(`/product/${productId}`)}
          onRetry={() => productsQuery.refetch()}
          onToggleLike={handleToggleLike}
          products={products}
          sortBar={
            <ShopSortBar
              sort={filters.sort}
              totalCount={totalCount}
              onOpenSort={() => router.push("/shop-sort-sheet")}
            />
          }
        />
      </View>
    </ProductLayout>
  );
};

const s = StyleSheet.create({
  content: { flex: 1 },
});

export default ShopScreen;
