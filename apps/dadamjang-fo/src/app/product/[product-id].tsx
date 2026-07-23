import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useProduct } from '@/features/catalog';

const ProductScreen = () => {
  const { 'product-id': productId } = useLocalSearchParams<{ 'product-id': string }>();
  useProduct(productId);

  return <View style={s.container} />;
};

const s = StyleSheet.create({ container: { flex: 1 } });

export default ProductScreen;
