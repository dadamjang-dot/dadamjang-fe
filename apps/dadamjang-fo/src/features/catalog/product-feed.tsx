import { LegendList } from '@legendapp/list/react-native';
import { router } from 'expo-router';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { PriceSummaryCard, useProductPriceSummaries } from '@/features/price-evidence';
import { colors } from '@dadamjang/design-tokens';

import type { ProductPriceSummary } from '@/features/price-evidence';

const getProductKey = (product: ProductPriceSummary) => product.productId;

const renderProduct = ({ item }: { item: ProductPriceSummary }) => (
  <PriceSummaryCard summary={item} onPress={() => router.push(`/product/${item.productId}`)} />
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
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  loader: { flex: 1 },
});
