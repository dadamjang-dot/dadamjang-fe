import { Redirect, Stack } from 'expo-router';

import { useCurrentUser } from '@/features/auth';

const ProtectedGroupLayout = () => {
  const { data: currentUser, isPending } = useCurrentUser();

  if (isPending) return null;
  if (!currentUser) return <Redirect href="/auth" />;

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default ProtectedGroupLayout;
