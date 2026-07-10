import { LegendList } from '@legendapp/list/react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native-unistyles';

import { ProductCard, SearchBox, useProductSearch } from '@/features/catalog';
import { NativeMessage, ScreenTitle } from '@/shared/components';

import type { Product } from '@/features/catalog';

const getProductKey = (product: Product) => product.productId;

const SearchScreen = () => {
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const products = useProductSearch(submittedKeyword);
  const items = products.data?.pages.flatMap((page) => page.nodes) ?? [];

  const submitSearch = () => setSubmittedKeyword(keyword.trim());

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard product={item} onPress={() => router.push(`/product/${item.productId}`)} />
  );

  return (
    <>
      <ScreenTitle title="찾고 싶은 위시템" subtitle="취향저격 상품을 바로 찾아요." />
      <SearchBox value={keyword} onChange={setKeyword} onSubmit={submitSearch} />
      {!submittedKeyword ? <NativeMessage title="검색어를 입력해 주세요" /> : null}
      {submittedKeyword && products.isPending ? <NativeMessage title="검색 중" loading /> : null}
      {submittedKeyword && !products.isPending && items.length === 0 ? (
        <NativeMessage title="검색 결과가 없어요" />
      ) : null}
      <LegendList
        data={items}
        renderItem={renderProduct}
        keyExtractor={getProductKey}
        estimatedItemSize={288}
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
});

export default SearchScreen;
