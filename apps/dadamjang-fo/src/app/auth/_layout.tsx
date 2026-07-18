import { Redirect, Stack } from 'expo-router';

import { useCurrentUser } from '@/features/auth';
import { getAuthCloseTarget } from '@/shared/navigation/last-tab-store';

/**
 * Auth layout — only for unauthenticated users.
 * The parent (root) Stack presents this as a full-screen modal (slide-up).
 * Inside-auth screens (signin, signup) use default push animation.
 * Back gesture is disabled everywhere in the auth flow.
 * Logged-in users get redirected to the page they came from.
 */
const AuthLayout = () => {
  const { data: currentUser, isPending } = useCurrentUser();

  if (isPending) return null;
  if (currentUser) return <Redirect href={getAuthCloseTarget()} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    />
  );
};

export default AuthLayout;
