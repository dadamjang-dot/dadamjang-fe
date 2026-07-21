import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/providers/app-providers';
import { initSentry, Sentry } from '@/shared/observability/sentry';

initSentry();

const RootLayout = () => (
  <AppProviders>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
    </Stack>
  </AppProviders>
);

export default Sentry.wrap(RootLayout);
