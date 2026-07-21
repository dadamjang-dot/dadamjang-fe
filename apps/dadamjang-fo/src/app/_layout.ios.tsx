import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";

import { AppProviders } from "@/providers/app-providers";
import { initSentry, Sentry } from "@/shared/observability/sentry";

initSentry();

const RootLayout = () => (
  <SafeAreaProvider>
    <AppProviders>
      <StatusBar style="dark" />
      <SafeAreaView style={s.container} edges={["top"]}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
        </Stack>
      </SafeAreaView>
    </AppProviders>
  </SafeAreaProvider>
);

const s = StyleSheet.create({ container: { flex: 1 } });

export default Sentry.wrap(RootLayout);
