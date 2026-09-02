import { type ReactElement, useMemo } from "react";
import { LegendList } from "@legendapp/list/react-native";
import { ActivityIndicator, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import type { ProductPriceSummary } from "@/features/price-evidence";
import { Button, ProductCard } from "@/shared/components";

type ShopProductGridProps = {
  categoryBar: ReactElement;
  filterBar: ReactElement;
  sortBar: ReactElement;
  products: ProductPriceSummary[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onProductPress: (productId: string) => void;
  likedProductIds: ReadonlySet<string>;
  onToggleLike: (productId: string, nextLiked: boolean) => void;
};

type ShopProductGridRow =
  | { type: "filter"; content: ReactElement }
  | { type: "sort"; content: ReactElement }
  | { type: "state" }
  | { type: "products"; products: ProductPriceSummary[] };

const GridState = ({
  isError,
  onRetry,
}: Pick<ShopProductGridProps, "isError" | "onRetry">) => (
  <View style={s.state}>
    <Text style={s.stateTitle}>
      {isError ? "상품을 불러오지 못했어요." : "상품이 없어요."}
    </Text>
    <Text style={s.stateDescription}>
      {isError
        ? "잠시 후 다시 시도해 주세요."
        : "필터를 바꾸면 다른 상품을 확인할 수 있어요."}
    </Text>
    {isError ? (
      <Button label="다시 시도" onPress={onRetry} style={s.retryButton} />
    ) : null}
  </View>
);

const LoadingState = () => (
  <View style={s.state}>
    <ActivityIndicator color={colors.primary} />
    <Text style={s.stateDescription}>상품을 불러오는 중이에요.</Text>
  </View>
);

const ShopProductGrid = ({
  categoryBar,
  filterBar,
  sortBar,
  products,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onRetry,
  onLoadMore,
  onProductPress,
  likedProductIds,
  onToggleLike,
}: ShopProductGridProps) => {
  const rows = useMemo<ShopProductGridRow[]>(() => {
    const controls: ShopProductGridRow[] = [
      { type: "filter", content: filterBar },
      { type: "sort", content: sortBar },
    ];

    if (isLoading || isError || products.length === 0) {
      return [...controls, { type: "state" }];
    }

    return [
      ...controls,
      ...Array.from(
        { length: Math.ceil(products.length / 2) },
        (_, index): ShopProductGridRow => ({
          type: "products",
          products: products.slice(index * 2, index * 2 + 2),
        }),
      ),
    ];
  }, [filterBar, isError, isLoading, products, sortBar]);

  return (
    <View style={s.list}>
      {categoryBar}
      <LegendList
        accessibilityLabel="상품 목록"
        contentContainerStyle={s.listContent}
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        extraData={likedProductIds}
        getItemType={(item) => item.type}
        keyExtractor={(item, index) =>
          item.type === "products"
            ? item.products.map((product) => product.productId).join("-")
            : `${item.type}-${index}`
        }
        onEndReached={
          hasNextPage && !isFetchingNextPage ? onLoadMore : undefined
        }
        onEndReachedThreshold={0.6}
        renderItem={({ item }) => {
          switch (item.type) {
            case "filter":
              return item.content;
            case "sort":
              return item.content;
            case "state":
              return isLoading ? (
                <LoadingState />
              ) : (
                <GridState isError={isError} onRetry={onRetry} />
              );
            case "products":
              return (
                <View style={s.productRow}>
                  {item.products.map((product) => (
                    <View key={product.productId} style={s.productCell}>
                      <ProductCard
                        imageUrl={product.thumbnail}
                        isExpressDelivery={product.isExpressDelivery}
                        isLiked={likedProductIds.has(product.productId)}
                        isOnSale={product.isOnSale}
                        name={product.name}
                        originalPrice={product.basePrice}
                        price={product.finalPrice}
                        productId={product.productId}
                        onPress={() => onProductPress(product.productId)}
                        onToggleLike={(nextLiked) =>
                          onToggleLike(product.productId, nextLiked)
                        }
                      />
                    </View>
                  ))}
                </View>
              );
          }
        }}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={s.footer} />
          ) : null
        }
        recycleItems
        showsVerticalScrollIndicator={false}
        style={s.list}
      />
    </View>
  );
};

const s = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  productCell: {
    width: "48%",
    minWidth: 0,
  },
  footer: {
    paddingVertical: 12,
  },
  state: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
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

export default ShopProductGrid;
