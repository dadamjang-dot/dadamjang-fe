import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useProduct } from '@/features/catalog';

const ProductScreen = () => {
  const { 'product-id': productId } = useLocalSearchParams<{ 'product-id': string }>();
  useProduct(productId);

  return <View style={{ flex: 1 }} />;
};

export default ProductScreen;
