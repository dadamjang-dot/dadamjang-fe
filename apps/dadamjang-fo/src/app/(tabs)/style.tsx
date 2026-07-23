import { View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { ActionButton, ProductHeader } from '@/shared/components'

const StyleScreen = () => (
  <View style={s.container}>
    <ProductHeader>
      <ActionButton actions={[{ icon: 'plus.square', onPress: () => {} }]} iconOnly />
      <ActionButton actions={[{ icon: 'cart', onPress: () => {} }]} iconOnly />
    </ProductHeader>
  </View>
)

const s = StyleSheet.create({ container: { flex: 1 } })

export default StyleScreen
