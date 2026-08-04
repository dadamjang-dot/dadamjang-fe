import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { colors } from '@dadamjang/design-tokens';

import type { ProductPriceSummary } from '@/features/price-evidence';

type ShopProductGridProps = {
  products: ProductPriceSummary[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onProductPress: (productId: string) => void;
};

const formatPrice = (price: number) => `${price.toLocaleString('ko-KR')}원`;

const ProductCard = ({ product, onPress }: { product: ProductPriceSummary; onPress: () => void }) => {
  const imageUrl = product.thumbnail;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.card}>
      <View style={s.imageWrapper}>
        {imageUrl ? <Image contentFit="cover" source={{ uri: imageUrl }} style={s.image} /> : <View style={s.imagePlaceholder} />}
      </View>
      <Text numberOfLines={2} style={s.title}>{product.name}</Text>
      <View style={s.priceRow}>
        <Text style={s.price}>{formatPrice(product.finalPrice)}</Text>
        {product.basePrice > product.finalPrice ? (
          <Text style={s.originalPrice}>{formatPrice(product.basePrice)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const GridState = ({ isError, onRetry }: Pick<ShopProductGridProps, 'isError' | 'onRetry'>) => (
  <View style={s.state}>
    <Text style={s.stateTitle}>{isError ? '상품을 불러오지 못했어요.' : '상품이 없어요.'}</Text>
    <Text style={s.stateDescription}>
      {isError ? '잠시 후 다시 시도해 주세요.' : '필터를 바꾸면 다른 상품을 확인할 수 있어요.'}
    </Text>
    {isError ? (
      <Pressable accessibilityRole="button" onPress={onRetry} style={s.retryButton}>
        <Text style={s.retryLabel}>다시 시도</Text>
      </Pressable>
    ) : null}
  </View>
);

const ShopProductGrid = ({
  products,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onRetry,
  onLoadMore,
  onProductPress,
}: ShopProductGridProps) => {
  if (isLoading) {
    return (
      <View style={s.state}>
        <ActivityIndicator color={colors.primary} />
        <Text style={s.stateDescription}>상품을 불러오는 중이에요.</Text>
      </View>
    );
  }

  if (isError || products.length === 0) {
    return <GridState isError={isError} onRetry={onRetry} />;
  }

  return (
    <FlatList
      accessibilityLabel="상품 목록"
      columnWrapperStyle={s.column}
      contentContainerStyle={s.listContent}
      contentInsetAdjustmentBehavior="automatic"
      data={products}
      keyExtractor={(product) => product.productId}
      numColumns={2}
      onEndReached={hasNextPage && !isFetchingNextPage ? onLoadMore : undefined}
      onEndReachedThreshold={0.6}
      renderItem={({ item }) => <ProductCard product={item} onPress={() => onProductPress(item.productId)} />}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={s.footer} /> : null}
      showsVerticalScrollIndicator={false}
      style={s.list}
    />
  );
};

const s = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  column: {
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  imageWrapper: {
    aspectRatio: 0.78,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: colors.primarySoft,
  },
  title: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  originalPrice: {
    color: colors.muted,
    fontSize: 12,
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  footer: {
    paddingVertical: 12,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateDescription: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  retryLabel: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ShopProductGrid;
