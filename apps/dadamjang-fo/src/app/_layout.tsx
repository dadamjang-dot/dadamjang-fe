import { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/providers/app-providers';
import { setLastPublicUrl } from '@/shared/navigation/last-tab-store';
import { initSentry, Sentry } from '@/shared/observability/sentry';

initSentry();

const TAB_ROUTES = new Set(['/', '/shop', '/style', '/wish']);

/** Tracks the last non-tab, non-auth URL the user visited.
 *  Used to restore the user to the right page after auth flow. */
const RouteTracker = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith('/auth') && !TAB_ROUTES.has(pathname)) {
      setLastPublicUrl(pathname);
    }
  }, [pathname]);

  return null;
};

const RootLayout = () => (
  <AppProviders>
    <RouteTracker />
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
    </Stack>
  </AppProviders>
);

export default Sentry.wrap(RootLayout);
