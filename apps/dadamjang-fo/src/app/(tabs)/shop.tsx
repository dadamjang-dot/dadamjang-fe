import { hashKey } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  startTransition,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useRef,
} from "react";
import { Alert, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { useAuthActionGate } from "@/features/auth";
import {
  toProductFilter,
  useCategories,
  useShopFilters,
} from "@/features/catalog";
import {
  priceEvidenceQueryKeys,
  useProductPriceSummaries,
} from "@/features/price-evidence";
import {
  ShopCategoryBar,
  ShopFilterBar,
  ShopProductGrid,
  ShopSortBar,
} from "@/features/shop";
import { useWishActions, useWishlist } from "@/features/wish";
import { ProductLayout } from "@/shared/components";
import { fetchUntilRowsGrow, uniqueBy } from "@/shared/lib";
import { Sentry } from "@/shared/observability/sentry";
import type { IconAction } from "@dadamjang/mobile";

const ShopScreen = () => {
  const router = useRouter();
  const { filters, updateFilters, startDraft } = useShopFilters();
  const { data: categories = [] } = useCategories();
  const currentUser = useAuthActionGate("/shop");
  const { data: wishlist = [] } = useWishlist(currentUser.isAuthenticated);
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
  const productQueryIdentity = hashKey(
    priceEvidenceQueryKeys.productPriceSummary(productFilter),
  );
  const productsQuery = useProductPriceSummaries(productFilter);
  const currentProductQueryIdentity = useRef(productQueryIdentity);
  const loadingProductQueryIdentity = useRef<string | undefined>(undefined);
  const products = useMemo(
    () =>
      uniqueBy(
        productsQuery.data?.pages.flatMap((page) => page.nodes) ?? [],
        (product) => product.productId,
      ),
    [productsQuery.data?.pages],
  );
  const totalCount = productsQuery.data?.pages[0]?.totalCount ?? 0;

  useLayoutEffect(() => {
    currentProductQueryIdentity.current = productQueryIdentity;
  }, [productQueryIdentity]);
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
      accessibilityLabel: "쇼핑 메뉴",
      icon: { md: "menu", sf: "line.3.horizontal" },
      onPress: () => router.push("/shop-menu-sheet"),
    },
    {
      accessibilityLabel: "장바구니",
      icon: { md: "shopping_cart", sf: "cart" },
      onPress: () => router.push("/cart"),
    },
  ];

  const handleToggleLike = (productId: string, nextLiked: boolean) => {
    currentUser.runProtectedAction(() => {
      const mutation = nextLiked ? addWish : removeWish;
      startTransition(async () => {
        updateOptimisticLike({ productId, liked: nextLiked });
        try {
          await mutation.mutateAsync(productId);
        } catch (error) {
          Sentry.captureException(error);
          Alert.alert("찜을 저장하지 못했어요.", "잠시 후 다시 시도해 주세요.");
        }
      });
    });
  };

  const handleLoadMore = async () => {
    if (
      loadingProductQueryIdentity.current === productQueryIdentity ||
      productsQuery.isFetchingNextPage ||
      !productsQuery.hasNextPage
    )
      return;

    loadingProductQueryIdentity.current = productQueryIdentity;
    try {
      await fetchUntilRowsGrow(
        productsQuery.data,
        productsQuery.fetchNextPage,
        (product) => product.productId,
        2,
        () => currentProductQueryIdentity.current === productQueryIdentity,
      );
    } finally {
      if (loadingProductQueryIdentity.current === productQueryIdentity) {
        loadingProductQueryIdentity.current = undefined;
      }
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
          likedProductIds={optimisticLikedProductIds}
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
