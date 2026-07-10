import { LegendList } from '@legendapp/list/react-native';
import { router } from 'expo-router';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { colors } from '@/theme/tokens';

import { usePersonalizedFeed } from './hooks';
import { ProductCard } from './product-card';
import type { Product } from './types';

const getProductKey = (product: Product) => product.productId;

const renderProduct = ({ item }: { item: Product }) => (
  <ProductCard product={item} onPress={() => router.push(`/product/${item.productId}`)} />
);

export const ProductFeed = () => {
  const feed = usePersonalizedFeed();
  const products = feed.data?.pages.flatMap((page) => page.nodes) ?? [];

  if (feed.isPending) return <ActivityIndicator color={colors.primary} style={styles.loader} />;

  return (
    <LegendList
      data={products}
      renderItem={renderProduct}
      keyExtractor={getProductKey}
      estimatedItemSize={288}
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
