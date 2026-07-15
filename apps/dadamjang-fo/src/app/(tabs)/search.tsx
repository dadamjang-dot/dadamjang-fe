import { LegendList } from '@legendapp/list/react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { SearchBox, useCategories } from '@/features/catalog';
import { PriceSummaryCard, useProductPriceSummaries } from '@/features/price-evidence';
import { NativeMessage, ScreenTitle } from '@/shared/components';
import { colors } from '@dadamjang/design-tokens';

import type { ProductSort } from '@/features/catalog';
import type { ProductPriceSummary } from '@/features/price-evidence';

const getProductKey = (product: ProductPriceSummary) => product.productId;
const sortOptions: { label: string; value: ProductSort }[] = [
  { label: '최신순', value: 'LATEST' },
  { label: '낮은 가격순', value: 'LOW_PRICE' },
  { label: '인기순', value: 'POPULAR' },
];

const SearchScreen = () => {
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [sort, setSort] = useState<ProductSort>('LATEST');
  const categories = useCategories();
  const products = useProductPriceSummaries({
    query: submittedKeyword,
    categoryId: selectedCategoryId,
    sort,
    first: 20,
  });
  const items = products.data?.pages.flatMap((page) => page.nodes) ?? [];

  const submitSearch = () => setSubmittedKeyword(keyword.trim());

  const renderProduct = ({ item }: { item: ProductPriceSummary }) => (
    <PriceSummaryCard summary={item} onPress={() => router.push(`/product/${item.productId}`)} />
  );

  return (
    <>
      <ScreenTitle title="Search" subtitle="원하는 위시템을 빠르게 찾아요." />
      <SearchBox value={keyword} onChange={setKeyword} onSubmit={submitSearch} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable style={styles.filterChip(!selectedCategoryId)} onPress={() => setSelectedCategoryId(undefined)}>
          <Text style={styles.filterText(!selectedCategoryId)}>전체</Text>
        </Pressable>
        {(categories.data ?? []).map((category) => (
          <Pressable
            key={category.categoryId}
            style={styles.filterChip(selectedCategoryId === category.categoryId)}
            onPress={() => setSelectedCategoryId(category.categoryId)}>
            <Text style={styles.filterText(selectedCategoryId === category.categoryId)}>{category.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {sortOptions.map((option) => (
          <Pressable
            key={option.value}
            style={styles.filterChip(sort === option.value)}
            onPress={() => setSort(option.value)}>
            <Text style={styles.filterText(sort === option.value)}>{option.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {!submittedKeyword && !selectedCategoryId ? (
        <View style={styles.emptySearchCard}>
          <Text style={styles.emptySearchKicker}>SEARCH GUIDE</Text>
          <Text style={styles.emptySearchTitle}>브랜드나 상품명을 검색해요</Text>
          <Text style={styles.emptySearchCopy}>카테고리, 가격순, 인기순으로 위시템을 빠르게 좁힐 수 있어요.</Text>
        </View>
      ) : null}
      {(submittedKeyword || selectedCategoryId) && products.isPending ? <NativeMessage title="검색 중" loading /> : null}
      {(submittedKeyword || selectedCategoryId) && !products.isPending && items.length === 0 ? (
        <NativeMessage title="검색 결과가 없어요" />
      ) : null}
      <LegendList
        data={items}
        renderItem={renderProduct}
        keyExtractor={getProductKey}
        estimatedItemSize={288}
        recycleItems
        contentContainerStyle={styles.content}
        onEndReached={() => {
          if (products.hasNextPage && !products.isFetchingNextPage) void products.fetchNextPage();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 7 },
  filterChip: (selected: boolean) => ({
    borderColor: selected ? colors.ink : colors.line,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: selected ? colors.ink : colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  }),
  filterText: (selected: boolean) => ({
    color: selected ? colors.surface : colors.ink,
    fontSize: 13,
    fontWeight: '800',
  }),
  emptySearchCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 18,
  },
  emptySearchKicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptySearchTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 8,
  },
  emptySearchCopy: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
});

export default SearchScreen;
