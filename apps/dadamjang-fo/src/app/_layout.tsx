import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { AppProviders } from "@/providers/app-providers";
import { ShopFiltersProvider } from "@/features/catalog";
import { initSentry, Sentry } from "@/shared/observability/sentry";
import { colors } from "@dadamjang/design-tokens";

initSentry();

const RootLayout = () => (
  <SafeAreaProvider>
    <AppProviders>
      <ShopFiltersProvider>
        <StatusBar style="dark" />
        <SafeAreaView style={s.container} edges={["top"]}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.surface },
            }}
          >
            <Stack.Screen
              name="auth"
              options={{
                presentation: "fullScreenModal",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="shop-filter-sheet"
              options={{
                presentation:
                  process.env.EXPO_OS === "ios" ? "formSheet" : "modal",
                sheetAllowedDetents: [0.5, 1],
                sheetGrabberVisible: true,
                headerShown: false,
              }}
            />
          </Stack>
        </SafeAreaView>
      </ShopFiltersProvider>
    </AppProviders>
  </SafeAreaProvider>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
});

export default Sentry.wrap(RootLayout);
