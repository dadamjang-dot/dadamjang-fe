import { useRouter } from "expo-router";

import { useRecentlyViewedProducts } from "../hooks";
import WishProductList from "./wish-product-list";

const WishRecentProductsTab = () => {
  const router = useRouter();
  const recentProducts = useRecentlyViewedProducts();

  return (
    <WishProductList
      emptyDescription="상품을 둘러보면 최근 본 상품이 여기에 쌓여요."
      emptyTitle="최근 본 상품이 없어요."
      isError={recentProducts.isError}
      isLoading={recentProducts.isLoading}
      onOpenProduct={(productId) => router.push(`/product/${productId}`)}
      onRetry={() => recentProducts.refetch()}
      products={(recentProducts.data ?? []).map((item) => item.product)}
    />
  );
};

export default WishRecentProductsTab;
