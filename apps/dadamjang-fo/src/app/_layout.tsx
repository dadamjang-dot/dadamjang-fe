import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/providers/app-providers';
import { initSentry, Sentry } from '@/shared/observability/sentry';

initSentry();

const RootLayout = () => (
  <AppProviders>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="auth/auth-sheet"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.45],
          sheetLargestUndimmedDetentIndex: 0,
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: 'transparent' },
          headerTransparent: true,
        }}
      />
    </Stack>
  </AppProviders>
);

export default Sentry.wrap(RootLayout);
