import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useAuthActionGate } from "@/features/auth";
import { StyleComposer } from "@/features/style/components";

const StyleComposeScreen = () => {
  const router = useRouter();
  const { authStatus, data, redirectToSignIn } =
    useAuthActionGate("/style-compose");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      redirectToSignIn(true);
    }
  }, [authStatus, redirectToSignIn]);

  if (authStatus !== "authenticated" || !data)
    return <View style={s.loading}><ActivityIndicator color={colors.primary} /></View>;
  return <StyleComposer onClose={() => router.back()} />;
};

const s = StyleSheet.create({ loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface } });

export default StyleComposeScreen;
