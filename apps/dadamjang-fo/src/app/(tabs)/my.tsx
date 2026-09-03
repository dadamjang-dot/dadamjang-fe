import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";
import { ActionButtonGroup } from "@dadamjang/mobile";

import { useAuthActionGate } from "@/features/auth";
import { Button, TitleHeader } from "@/shared/components";

const MyScreen = () => {
  const router = useRouter();
  const currentUser = useAuthActionGate("/my");
  const { authStatus, redirectToSignIn } = currentUser;
  const isWaiting =
    currentUser.authStatus === "loading" ||
    currentUser.authStatus === "offline";

  useFocusEffect(() => {
    if (authStatus === "unauthenticated") redirectToSignIn(true);
  });

  return (
    <View style={s.container}>
      <TitleHeader title="마이">
        <ActionButtonGroup
          actions={[
            {
              accessibilityLabel: "설정",
              icon: { md: "settings", sf: "gearshape" },
              onPress: () => router.push("/settings"),
            },
            {
              accessibilityLabel: "장바구니",
              icon: { md: "shopping_cart", sf: "cart" },
              onPress: () => router.push("/cart"),
            },
          ]}
          variant="circularPair"
        />
      </TitleHeader>
      {currentUser.authStatus === "authenticated" && currentUser.data ? (
        <View style={s.account}>
          <Text style={s.accountId}>{currentUser.data.userid}</Text>
          <Text style={s.stateDescription}>{currentUser.data.email}</Text>
          <Button
            label="주문 내역"
            onPress={() => router.push("/orders")}
            variant="secondary"
          />
        </View>
      ) : isWaiting ? (
        <View style={s.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.stateTitle}>
            {currentUser.authStatus === "offline"
              ? "연결을 기다리고 있어요."
              : "로그인 상태를 확인하고 있어요."}
          </Text>
        </View>
      ) : currentUser.authStatus === "error" ? (
        <View style={s.state}>
          <Text accessibilityRole="alert" style={s.stateTitle}>
            로그인 상태를 확인하지 못했어요.
          </Text>
          <Button
            label="다시 시도"
            onPress={() => void currentUser.retryAuth()}
          />
        </View>
      ) : currentUser.authStatus === "unauthenticated" ? (
        <View style={s.state}>
          <Text style={s.stateTitle}>로그인 화면으로 이동하고 있어요.</Text>
        </View>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  stateDescription: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  account: { gap: spacing.md, padding: spacing.xl },
  accountId: { color: colors.ink, fontSize: 22, fontWeight: "700" },
});

export default MyScreen;
