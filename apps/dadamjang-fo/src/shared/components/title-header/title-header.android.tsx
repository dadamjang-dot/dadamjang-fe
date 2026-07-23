import { type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'

interface TitleHeaderProps {
  title: string
  children?: ReactNode
}

const TitleHeader = ({ title, children }: TitleHeaderProps) => (
  <View style={s.container}>
    <Text style={s.title}>{title}</Text>
    {children}
  </View>
)

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 24, fontWeight: '700' },
})

export default TitleHeader
