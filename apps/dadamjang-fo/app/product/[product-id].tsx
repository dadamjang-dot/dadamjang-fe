import { useLocalSearchParams } from 'expo-router';

import { ProductDetailView, useProduct } from '@/features/catalog';
import { useCartActions } from '@/features/cart';
import { useWishlistActions } from '@/features/wishlist';

const ProductScreen = () => {
  const { 'product-id': productId } = useLocalSearchParams<{ 'product-id': string }>();
  const product = useProduct(productId);
  const cart = useCartActions();
  const wishlist = useWishlistActions();
  const primarySkuId = product.data?.skus[0]?.skuId;

  const addWishlist = () => {
    if (product.data?.productId) wishlist.add.mutate(product.data.productId);
  };

  const addCart = () => {
    if (primarySkuId) cart.upsert.mutate({ skuId: primarySkuId, quantity: 1 });
  };

  return (
    <ProductDetailView
      product={product.data}
      loading={product.isPending}
      onAddWishlist={addWishlist}
      onAddCart={addCart}
    />
  );
};

export default ProductScreen;
