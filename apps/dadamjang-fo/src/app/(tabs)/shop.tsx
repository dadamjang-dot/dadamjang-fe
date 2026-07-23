import { View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { ActionButton, ProductHeader } from '@/shared/components'

const ShopScreen = () => (
  <View style={s.container}>
    <ProductHeader>
      <ActionButton
        actions={[
          { icon: 'line.3.horizontal', onPress: () => {} },
          { icon: 'cart', onPress: () => {} },
        ]}
        iconOnly
      />
    </ProductHeader>
  </View>
)

const s = StyleSheet.create({ container: { flex: 1 } })

export default ShopScreen
