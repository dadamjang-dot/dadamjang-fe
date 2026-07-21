import { View } from 'react-native';

import { useCurrentUser } from '@/features/auth';

const WishScreen = () => {
  const { isPending } = useCurrentUser();

  if (isPending) return null;

  return <View style={{ flex: 1 }} />;
};

export default WishScreen;
