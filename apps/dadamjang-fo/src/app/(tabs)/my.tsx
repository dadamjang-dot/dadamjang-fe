import { View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { useCurrentUser } from '@/features/auth'
import { ActionButton, TitleHeader } from '@/shared/components'

const MyScreen = () => {
  const { isPending } = useCurrentUser()

  if (isPending) return null

  return (
    <View style={s.container}>
      <TitleHeader title="My">
        <ActionButton actions={[{ icon: 'gearshape', onPress: () => {} }]} iconOnly />
        <ActionButton actions={[{ icon: 'cart', onPress: () => {} }]} iconOnly />
      </TitleHeader>
    </View>
  )
}

const s = StyleSheet.create({ container: { flex: 1 } })

export default MyScreen
