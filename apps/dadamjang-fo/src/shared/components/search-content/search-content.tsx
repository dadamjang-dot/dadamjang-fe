import { LegendList } from "@legendapp/list/react-native";
import { usePathname, useRouter } from "expo-router";
import { useLayoutEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { colors } from "@dadamjang/design-tokens";

import { useAuthActionGate } from "@/features/auth";
import { useProductSearch } from "@/features/catalog";
import { useWishActions, useWishlist } from "@/features/wish";
import { Button, ProductCard } from "@/shared/components";
import { fetchUntilRowsGrow, uniqueBy } from "@/shared/lib";

import type { SearchContentProps } from "./search-content.types";

const SearchContent = ({ keyword }: SearchContentProps) => {
  const router = useRouter();
  const auth = useAuthActionGate(usePathname());
  const query = useProductSearch(keyword ?? "");
  const wishlist = useWishlist(auth.isAuthenticated);
  const wishActions = useWishActions();
  const queryIdentity = keyword ?? "";
  const currentQuery = useRef<string | undefined>(queryIdentity);
  const loadingQuery = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    currentQuery.current = queryIdentity;
    return () => {
      currentQuery.current = undefined;
    };
  }, [queryIdentity]);
  const products = uniqueBy(
    query.data?.pages.flatMap((page) => page.nodes) ?? [],
    (product) => product.productId,
  );
  const likedProductIds = new Set(
    wishlist.data?.map((item) => item.productId) ?? [],
  );
  const loadMore = async () => {
    if (
      loadingQuery.current === queryIdentity ||
      query.isFetchingNextPage ||
      !query.hasNextPage
    )
      return;
    loadingQuery.current = queryIdentity;
    try {
      await fetchUntilRowsGrow(
        query.data,
        query.fetchNextPage,
        (product) => product.productId,
        1,
        () => currentQuery.current === queryIdentity,
      );
    } finally {
      if (loadingQuery.current === queryIdentity)
        loadingQuery.current = undefined;
    }
  };

  if (!keyword) {
    return (
      <View style={s.container}>
        <Text style={s.title}>최근 검색어</Text>
        <Text style={s.emptyText}>최근 검색어가 없어요.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>{`"${keyword}" 검색 결과`}</Text>
      {query.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : query.isError ? (
        <View style={s.state}>
          <Text style={s.emptyText}>검색 결과를 불러오지 못했어요.</Text>
          <Button label="다시 시도" onPress={() => query.refetch()} />
        </View>
      ) : products.length === 0 ? (
        <Text style={s.emptyText}>검색 결과가 없어요.</Text>
      ) : (
        <LegendList
          accessibilityLabel="검색 상품 목록"
          data={products}
          keyExtractor={(product) => product.productId}
          onEndReached={
            query.hasNextPage && !query.isFetchingNextPage
              ? loadMore
              : undefined
          }
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} />
            ) : query.hasNextPage ? (
              <Button label="더 보기" onPress={loadMore} />
            ) : null
          }
          recycleItems
          renderItem={({ item: product }) => {
            const sku = product.skus[0];
            const isLiked = likedProductIds.has(product.productId);
            return (
              <ProductCard
                imageUrl={product.imageUrls[0]}
                isExpressDelivery={product.isExpressDelivery}
                isLiked={isLiked}
                isOnSale={product.isOnSale}
                name={product.title}
                price={sku?.price ?? 0}
                productId={product.productId}
                onPress={() => router.push(`/product/${product.productId}`)}
                onToggleLike={(nextLiked) => {
                  auth.runProtectedAction(() => {
                    const mutation = nextLiked
                      ? wishActions.add
                      : wishActions.remove;
                    mutation.mutate(product.productId);
                  });
                }}
              />
            );
          }}
          showsVerticalScrollIndicator={false}
          style={s.list}
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
  },
  list: { flex: 1 },
  state: { gap: 12 },
});

export default SearchContent;
