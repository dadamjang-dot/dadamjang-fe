import { type ReactNode } from 'react'
import { View } from 'react-native'

interface ProductHeaderProps {
  children?: ReactNode
}

const ProductHeader = ({ children }: ProductHeaderProps) => (
  <View
    style={{
      flexDirection: 'row',
      gap: 20,
      justifyContent: 'space-between',
      paddingHorizontal: 16,
    }}
  >
    {children}
  </View>
)

export default ProductHeader
