import { StyleSheet, View } from 'react-native';
import { ActionButtonGroup, ProductHeader } from '@/shared/components';

const HomeScreen = () => (
  <View style={s.container}>
    <ProductHeader>
      <ActionButtonGroup
        actions={[
          { icon: 'bell', onPress: () => {}, iconOnly: true },
          { icon: 'cart', onPress: () => {}, iconOnly: true },
        ]}
      />
    </ProductHeader>
  </View>
);

const s = StyleSheet.create({ container: { flex: 1 } });

export default HomeScreen;
