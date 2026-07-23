import { type ReactNode } from 'react'
import { View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'

interface ProductHeaderProps {
  children?: ReactNode
}

const ProductHeader = ({ children }: ProductHeaderProps) => (
  <View style={s.container}>{children}</View>
)

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
})

export default ProductHeader
