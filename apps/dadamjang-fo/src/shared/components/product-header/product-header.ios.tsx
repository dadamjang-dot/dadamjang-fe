import { type ReactNode } from 'react'
import { View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'

import { SearchInput } from '@/shared/components/search-input'

interface ProductHeaderProps {
  children?: ReactNode
}

const ProductHeader = ({ children }: ProductHeaderProps) => (
  <View style={s.container}>
    <View style={s.searchWrapper}>
      <SearchInput placeholder="Search" />
    </View>
    {children}
  </View>
)

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  searchWrapper: { flex: 1 },
})

export default ProductHeader
