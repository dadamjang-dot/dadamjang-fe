import { LegendList } from '@legendapp/list/react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
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
      <ScreenTitle title="찾고 싶은 위시템" subtitle="취향저격 상품을 바로 찾아요." />
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
      {!submittedKeyword && !selectedCategoryId ? <NativeMessage title="검색어를 입력하거나 카테고리를 선택해 주세요" /> : null}
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
  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  filterChip: (selected: boolean) => ({
    borderRadius: 999,
    backgroundColor: selected ? colors.primary : colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  }),
  filterText: (selected: boolean) => ({
    color: selected ? colors.surface : colors.ink,
    fontWeight: '700',
  }),
});

export default SearchScreen;
