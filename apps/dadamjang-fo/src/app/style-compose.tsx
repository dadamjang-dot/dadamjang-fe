import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useCurrentUser } from "@/features/auth";
import { StyleComposer } from "@/features/style/components";

const StyleComposeScreen = () => {
  const router = useRouter();
  const currentUser = useCurrentUser();

  useEffect(() => {
    if (!currentUser.isLoading && !currentUser.data) {
      router.replace({ pathname: "/auth/signin", params: { returnTo: "/style-compose" } });
    }
  }, [currentUser.data, currentUser.isLoading, router]);

  if (currentUser.isLoading || !currentUser.data) return <View style={s.loading}><ActivityIndicator color={colors.primary} /></View>;
  return <StyleComposer onClose={() => router.back()} />;
};

const s = StyleSheet.create({ loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface } });

export default StyleComposeScreen;
