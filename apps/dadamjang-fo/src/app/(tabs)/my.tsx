import { View } from 'react-native';

import { useCurrentUser } from '@/features/auth';

const MyScreen = () => {
  const { data: currentUser, isPending } = useCurrentUser();

  if (isPending) return null;
  if (!currentUser) return null;

  return <View style={{ flex: 1 }} />;
};

export default MyScreen;
