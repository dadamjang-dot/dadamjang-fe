import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { fetchUntilRowsGrow, uniqueBy } from "@/shared/lib";
import type { IconAction } from "@dadamjang/mobile";

const ShopScreen = () => {
  const router = useRouter();
  const { filters, updateFilters, startDraft } = useShopFilters();
  const { data: categories = [] } = useCategories();
  const { data: currentUser } = useCurrentUser();
  const { data: wishlist = [] } = useWishlist(Boolean(currentUser));
  const { add: addWish, remove: removeWish } = useWishActions();
  const [likedProductIds, setLikedProductIds] = useState<Set<string>>(
    () => new Set(),
  );
  const productFilter = useMemo(() => toProductFilter(filters), [filters]);
  const productsQuery = useProductPriceSummaries(productFilter);
  const isLoadingMore = useRef(false);
  const products = useMemo(
    () =>
      uniqueBy(
        productsQuery.data?.pages.flatMap((page) => page.nodes) ?? [],
        (product) => product.productId,
      ),
    [productsQuery.data?.pages],
  );
  const totalCount = productsQuery.data?.pages[0]?.totalCount ?? 0;

  useEffect(() => {
    if (currentUser) {
      setLikedProductIds(new Set(wishlist.map((item) => item.productId)));
    }
  }, [currentUser, wishlist]);

  const openFilter = (
    mode: "category" | "brand" | "color" | "size" | "price",
  ) => {
    startDraft();
    router.push({
      pathname: "/shop-filter-sheet",
      params: { mode },
    });
  };

  const headerActions: IconAction[] = [
    {
      accessibilityLabel: "메뉴",
      icon: { md: "menu", sf: "line.3.horizontal" },
      onPress: () => {},
    },
    {
      accessibilityLabel: "장바구니",
      icon: { md: "shopping_cart", sf: "cart" },
      onPress: () => {},
    },
  ];

  const handleToggleLike = (productId: string, nextLiked: boolean) => {
    const previousLiked = likedProductIds.has(productId);
    setLikedProductIds((current) => {
      const next = new Set(current);
      if (nextLiked) next.add(productId);
      else next.delete(productId);
      return next;
    });

    if (!currentUser) return;

    const mutation = nextLiked ? addWish : removeWish;
    mutation.mutate(productId, {
      onError: () =>
        setLikedProductIds((current) => {
          const rollback = new Set(current);
          if (previousLiked) rollback.add(productId);
          else rollback.delete(productId);
          return rollback;
        }),
    });
  };

  const handleLoadMore = async () => {
    if (
      isLoadingMore.current ||
      productsQuery.isFetchingNextPage ||
      !productsQuery.hasNextPage
    )
      return;

    isLoadingMore.current = true;
    try {
      await fetchUntilRowsGrow(
        productsQuery.data,
        productsQuery.fetchNextPage,
        (product) => product.productId,
        2,
      );
    } finally {
      isLoadingMore.current = false;
    }
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
          likedProductIds={likedProductIds}
          onLoadMore={handleLoadMore}
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
