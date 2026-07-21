import { StyleSheet, View } from 'react-native';
import { ActionButton, ProductHeader } from '@/shared/components';

const StyleScreen = () => (
  <View style={s.container}>
    <ProductHeader>
      <ActionButton icon="plus.square" onPress={() => {}} iconOnly />
      <ActionButton icon="cart" onPress={() => {}} iconOnly />
    </ProductHeader>
  </View>
);

const s = StyleSheet.create({ container: { flex: 1 } });

export default StyleScreen;
