import { StyleSheet, View } from 'react-native';
import { ActionButton, ProductHeader } from '@/shared/components';

const HomeScreen = () => (
  <View style={s.container}>
    <ProductHeader>
      <ActionButton
        actions={[
          { icon: 'bell', onPress: () => {} },
          { icon: 'cart', onPress: () => {} },
        ]}
        iconOnly
      />
    </ProductHeader>
  </View>
);

const s = StyleSheet.create({ container: { flex: 1 } });

export default HomeScreen;
