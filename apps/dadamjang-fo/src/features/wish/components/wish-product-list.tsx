import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import type { Product } from "@/features/catalog";
import type { WishProductFilters } from "../types";
import { filterWishProducts, sortWishProducts } from "../wish-product-rules";
import WishProductCard from "./wish-product-card";
import WishProductFilterBar from "./wish-product-filter-bar";
import WishSortSheet from "./wish-sort-sheet";
import WishState from "./wish-state";

const defaultFilters: WishProductFilters = {
  saleOnly: false,
  excludeSoldOut: false,
  sort: "RECOMMENDED",
};

type WishProductListProps = {
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onOpenProduct: (productId: string) => void;
  onRetry: () => void;
  onRemoveWish?: (productId: string) => void;
};

const WishProductList = ({
  products,
  isLoading,
  isError,
  emptyTitle,
  emptyDescription,
  onOpenProduct,
  onRetry,
  onRemoveWish,
}: WishProductListProps) => {
  const [filters, setFilters] = useState<WishProductFilters>(defaultFilters);
  const [isSortSheetVisible, setSortSheetVisible] = useState(false);
  const visibleProducts = useMemo(
    () => sortWishProducts(filterWishProducts(products, filters), filters),
    [filters, products],
  );

  if (isLoading) {
    return <WishState isLoading title="상품을 불러오는 중이에요." />;
  }

  if (isError) {
    return (
      <WishState
        description="잠시 후 다시 시도해 주세요."
        onRetry={onRetry}
        title="상품을 불러오지 못했어요."
      />
    );
  }

  return (
    <View style={s.container}>
      <WishProductFilterBar
        filters={filters}
        onOpenSort={() => setSortSheetVisible(true)}
        onToggleSale={() =>
          setFilters((current) => ({ ...current, saleOnly: !current.saleOnly }))
        }
        onToggleSoldOut={() =>
          setFilters((current) => ({
            ...current,
            excludeSoldOut: !current.excludeSoldOut,
          }))
        }
      />
      {visibleProducts.length ? (
        <ScrollView
          contentContainerStyle={s.content}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          {visibleProducts.map((product) => (
            <WishProductCard
              key={product.productId}
              onPress={() => onOpenProduct(product.productId)}
              onRemove={
                onRemoveWish
                  ? () => onRemoveWish(product.productId)
                  : undefined
              }
              product={product}
            />
          ))}
        </ScrollView>
      ) : (
        <WishState
          description={products.length ? "필터를 바꾸면 다른 상품을 확인할 수 있어요." : emptyDescription}
          title={products.length ? "조건에 맞는 상품이 없어요." : emptyTitle}
        />
      )}
      <WishSortSheet
        onClose={() => setSortSheetVisible(false)}
        onSelect={(sort) => {
          setFilters((current) => ({ ...current, sort }));
          setSortSheetVisible(false);
        }}
        selectedSort={filters.sort}
        visible={isSortSheetVisible}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
});

export default WishProductList;
