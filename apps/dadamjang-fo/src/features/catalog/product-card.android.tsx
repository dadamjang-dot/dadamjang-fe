import { Image } from 'expo-image';
import { Card, Column, Host, RNHostView, Text } from '@expo/ui/jetpack-compose';
import { clickable, fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { StyleSheet } from 'react-native-unistyles';

import { colors } from '@dadamjang/design-tokens';

import type { Product } from './types';

type ProductCardProps = {
  product: Product;
  onPress: () => void;
};

const getPrice = (product: Product) => product.skus[0]?.price ?? 0;

export const ProductCard = ({ product, onPress }: ProductCardProps) => (
  <Host matchContents style={styles.host}>
    <Card colors={{ containerColor: colors.surface }} modifiers={[fillMaxWidth(), clickable(onPress)]}>
      <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[paddingAll(12)]}>
       <RNHostView matchContents>
         <Image source={product.imageUrls[0]} style={styles.image} contentFit="cover" transition={160} />
       </RNHostView>
        <Text color={colors.muted} style={{ typography: 'labelSmall', fontWeight: 'bold' }}>WISH ITEM</Text>
        <Text maxLines={2} style={{ typography: 'titleSmall', fontWeight: 'bold' }} color={colors.ink}>
          {product.title}
        </Text>
        <Text color={colors.ink} style={{ typography: 'titleMedium', fontWeight: 'bold' }}>
          {getPrice(product).toLocaleString()}원
        </Text>
      </Column>
    </Card>
  </Host>
);

const styles = StyleSheet.create({
  host: { marginBottom: 12 },
  image: { width: '100%', height: 248, borderRadius: 14, backgroundColor: colors.canvas },
});
