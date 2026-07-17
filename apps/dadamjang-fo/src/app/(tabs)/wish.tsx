import { LegendList } from '@legendapp/list/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';

import { ProductCard } from '@/features/catalog';
import { useWish } from '@/features/wish';
import { NativeMessage, ScreenTitle } from '@/shared/components';

import type { WishItem } from '@/features/wish/api';

const getWishKey = (item: WishItem) => item.wishId;

const renderWish = ({ item }: { item: WishItem }) => (
  <ProductCard product={item.product} onPress={() => router.push(`/product/${item.productId}`)} />
);

const WishScreen = () => {
  const wish = useWish();
  const items = wish.data ?? [];

  return (
    <>
      <ScreenTitle title="나의 위시템" subtitle="저장한 취향저격 상품을 모아봐요." />
      {wish.isPending ? <NativeMessage title="위시템을 불러오는 중" loading /> : null}
      {!wish.isPending && items.length === 0 ? <NativeMessage title="아직 저장한 위시템이 없어요" /> : null}
      <LegendList
        data={items}
        renderItem={renderWish}
        keyExtractor={getWishKey}
        estimatedItemSize={288}
        recycleItems
        contentContainerStyle={styles.content}
      />
    </>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 120 },
});

export default WishScreen;
