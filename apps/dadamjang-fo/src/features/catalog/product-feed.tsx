import { LegendList } from '@legendapp/list/react-native';
import { router } from 'expo-router';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { PriceSummaryCard, useProductPriceSummaries } from '@/features/price-evidence';
import { colors } from '@dadamjang/design-tokens';

import type { ProductPriceSummary } from '@/features/price-evidence';

const getProductKey = (product: ProductPriceSummary) => product.productId;

const renderProduct = ({ item }: { item: ProductPriceSummary }) => (
  <PriceSummaryCard summary={item} onPress={() => router.push(`/product/${item.productId}`)} />
);

const EmptyFeed = () => (
  <View style={styles.emptyCard}>
    <Text style={styles.emptyKicker}>COMING SOON</Text>
    <Text style={styles.emptyTitle}>오늘의 위시템을 준비 중이에요</Text>
    <Text style={styles.emptyCopy}>상품 데이터가 연결되면 이 영역에 KREAM식 상품 카드가 쌓입니다.</Text>
  </View>
);

export const ProductFeed = () => {
  const feed = useProductPriceSummaries({ first: 20, sort: 'POPULAR' });
  const products = feed.data?.pages.flatMap((page) => page.nodes) ?? [];

  if (feed.isPending) return <ActivityIndicator color={colors.primary} style={styles.loader} />;

  return (
    <LegendList
      data={products}
      renderItem={renderProduct}
      keyExtractor={getProductKey}
      estimatedItemSize={288}
      recycleItems
      contentContainerStyle={styles.content}
      onEndReached={() => {
        if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<EmptyFeed />}
      refreshControl={
        <RefreshControl
          refreshing={feed.isRefetching}
          onRefresh={() => void feed.refetch()}
          tintColor={colors.primary}
        />
      }
      ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
    />
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 0 },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  emptyKicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 8,
  },
  emptyCopy: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  loader: { flex: 1 },
});
