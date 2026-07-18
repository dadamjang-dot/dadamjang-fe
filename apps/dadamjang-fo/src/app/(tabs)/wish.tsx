import { useCallback } from 'react';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { View } from 'react-native';

import { useCurrentUser } from '@/features/auth';
import {
  setRouteBeforeAuth,
  consumeSuppressAuth,
  getLastNonMyTabName,
} from '@/shared/navigation/last-tab-store';

const WishScreen = () => {
  const { data: currentUser, isPending } = useCurrentUser();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      if (isPending) return;
      if (currentUser) return;

      // Just closed auth without logging in — switch to previous tab via local nav
      if (consumeSuppressAuth()) {
        const tabName = getLastNonMyTabName();
        if (tabName === 'my') {
          (navigation as any).navigate('index');
        } else {
          (navigation as any).navigate(tabName);
        }
        return;
      }

      // Not logged in — capture route before redirecting.
      const rootNav = navigation.getParent();
      const rootState = rootNav?.getState();
      if (rootState) {
        const currentRoute = rootState.routes[rootState.index];
        if (currentRoute && currentRoute.name !== '(tabs)') {
          setRouteBeforeAuth({
            name: currentRoute.name,
            params: currentRoute.params as Record<string, string | undefined>,
          });
        } else {
          setRouteBeforeAuth(null);
        }
      }

      router.push('/auth');
    }, [currentUser, isPending, navigation]),
  );

  if (isPending) return null;
  if (!currentUser) return null;

  return <View style={{ flex: 1 }} />;
};

export default WishScreen;
