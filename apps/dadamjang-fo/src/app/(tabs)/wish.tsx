import { View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { useCurrentUser } from '@/features/auth'
import { ActionButton, TitleHeader } from '@/shared/components'
import { colors } from '@dadamjang/design-tokens'

const WishScreen = () => {
  const { isPending } = useCurrentUser()

  if (isPending) return null

  return (
    <View style={s.container}>
      <TitleHeader title="WISH">
        <ActionButton actions={[{ icon: 'cart', onPress: () => {} }]} iconOnly />
      </TitleHeader>
    </View>
  )
}

const s = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.surface } })

export default WishScreen
