import { LegendList } from '@legendapp/list/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';

import { ProductCard } from '@/features/catalog';
import { useWishlist } from '@/features/wish';
import { NativeMessage, ScreenTitle } from '@/shared/components';

import type { WishlistItem } from '@/features/wish/api';

const getWishlistKey = (item: WishlistItem) => item.wishId;

const renderWishlist = ({ item }: { item: WishlistItem }) => (
  <ProductCard product={item.product} onPress={() => router.push(`/product/${item.productId}`)} />
);

const WishlistScreen = () => {
  const wishlist = useWishlist();
  const items = wishlist.data ?? [];

  return (
    <>
      <ScreenTitle title="나의 위시템" subtitle="저장한 취향저격 상품을 모아봐요." />
      {wishlist.isPending ? <NativeMessage title="위시템을 불러오는 중" loading /> : null}
      {!wishlist.isPending && items.length === 0 ? <NativeMessage title="아직 저장한 위시템이 없어요" /> : null}
      <LegendList
        data={items}
        renderItem={renderWishlist}
        keyExtractor={getWishlistKey}
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

export default WishlistScreen;
