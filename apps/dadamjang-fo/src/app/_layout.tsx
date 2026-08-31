import { type ErrorBoundaryProps, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { AppProviders } from "@/providers/app-providers";
import { ShopFiltersProvider } from "@/features/catalog";
import { Button } from "@/shared/components/button";
import { initSentry, Sentry } from "@/shared/observability/sentry";
import { colors } from "@dadamjang/design-tokens";

initSentry();

const ErrorBoundary = ({ error, retry }: ErrorBoundaryProps) => {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <View style={s.errorContainer}>
      <Text accessibilityRole="alert" style={s.errorTitle}>
        화면을 불러오지 못했어요.
      </Text>
      <Text style={s.errorDescription}>잠시 후 다시 시도해 주세요.</Text>
      <Button label="다시 시도" onPress={() => void retry()} />
    </View>
  );
};

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
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="auth-identity-provider-sheet"
              options={{
                presentation:
                  process.env.EXPO_OS === "ios" ? "formSheet" : "modal",
                sheetAllowedDetents: [0.44],
                sheetExpandsWhenScrolledToEdge: false,
                sheetGrabberVisible: true,
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="shop-filter-sheet"
              options={{
                presentation:
                  process.env.EXPO_OS === "ios" ? "formSheet" : "modal",
                sheetAllowedDetents: [0.5],
                sheetExpandsWhenScrolledToEdge: false,
                sheetGrabberVisible: true,
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="shop-sort-sheet"
              options={{
                presentation:
                  process.env.EXPO_OS === "ios" ? "formSheet" : "modal",
                sheetAllowedDetents: [0.5],
                sheetExpandsWhenScrolledToEdge: false,
                sheetGrabberVisible: true,
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="shop-menu-sheet"
              options={{
                presentation:
                  process.env.EXPO_OS === "ios" ? "formSheet" : "modal",
                sheetAllowedDetents: [0.5],
                sheetExpandsWhenScrolledToEdge: false,
                sheetGrabberVisible: true,
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="style-compose"
              options={{
                presentation: "fullScreenModal",
                gestureEnabled: false,
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
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: colors.surface,
  },
  errorTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  errorDescription: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
});

export default Sentry.wrap(RootLayout);
export { ErrorBoundary };
