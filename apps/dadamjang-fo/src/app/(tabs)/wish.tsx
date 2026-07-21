import { StyleSheet, View } from 'react-native';
import { useCurrentUser } from '@/features/auth';
import { ActionButton, TitleHeader } from '@/shared/components';

const WishScreen = () => {
  const { isPending } = useCurrentUser();

  if (isPending) return null;

  return (
    <View style={s.container}>
      <TitleHeader title="Wish">
        <ActionButton icon="cart" onPress={() => {}} iconOnly />
      </TitleHeader>
    </View>
  );
};

const s = StyleSheet.create({ container: { flex: 1 } });

export default WishScreen;
