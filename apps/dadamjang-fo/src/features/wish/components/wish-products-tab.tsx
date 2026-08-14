import { useRouter } from "expo-router";

import { useWishActions, useWishlist } from "../hooks";
import WishProductList from "./wish-product-list";

const WishProductsTab = () => {
  const router = useRouter();
  const wishlist = useWishlist();
  const wishActions = useWishActions();

  return (
    <WishProductList
      emptyDescription="마음에 드는 상품을 저장해 보세요."
      emptyTitle="찜한 상품이 없어요."
      isError={wishlist.isError}
      isLoading={wishlist.isLoading}
      onOpenProduct={(productId) => router.push(`/product/${productId}`)}
      onRemoveWish={(productId) => wishActions.remove.mutate(productId)}
      onRetry={() => wishlist.refetch()}
      products={(wishlist.data ?? []).map((item) => item.product)}
    />
  );
};

export default WishProductsTab;
