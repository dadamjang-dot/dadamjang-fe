import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { trackCommerceEvent } from '@/features/analytics';
import { ProductDetailView, useProduct } from '@/features/catalog';
import { useCartActions } from '@/features/cart';
import { useComparisonActions } from '@/features/comparison';
import { useWishActions } from '@/features/wish';

const ProductScreen = () => {
  const { 'product-id': productId } = useLocalSearchParams<{ 'product-id': string }>();
  const product = useProduct(productId);
  const cart = useCartActions();
  const comparison = useComparisonActions();
  const wish = useWishActions();
  const [selectedSkuId, setSelectedSkuId] = useState<string>();

  useEffect(() => {
    const primarySkuId = product.data?.skus[0]?.skuId;
    if (primarySkuId && !selectedSkuId) setSelectedSkuId(primarySkuId);
  }, [product.data?.skus, selectedSkuId]);

  const addWish = () => {
    if (product.data?.productId) {
      trackCommerceEvent({ eventType: 'WISH_CLICKED', subjectType: 'PRODUCT', subjectId: product.data.productId });
      wish.add.mutate(product.data.productId);
    }
  };

  const addComparison = () => {
    if (product.data?.productId) {
      trackCommerceEvent({ eventType: 'COMPARISON_CLICKED', subjectType: 'PRODUCT', subjectId: product.data.productId });
      comparison.add.mutate(product.data.productId);
    }
  };

  const addCart = () => {
    if (selectedSkuId) {
      trackCommerceEvent({ eventType: 'CART_ADD_CLICKED', subjectType: 'SKU', subjectId: selectedSkuId });
      cart.upsert.mutate({ skuId: selectedSkuId, quantity: 1 });
    }
  };

  return (
    <ProductDetailView
      product={product.data}
      loading={product.isPending}
      selectedSkuId={selectedSkuId}
      onSelectSku={setSelectedSkuId}
      onAddWish={addWish}
      onAddComparison={addComparison}
      onAddCart={addCart}
    />
  );
};

export default ProductScreen;
