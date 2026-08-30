import { useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";
import { ActionButtonGroup } from "@dadamjang/mobile";

import { useCurrentUser, useSignOut } from "@/features/auth";
import { Button, TitleHeader } from "@/shared/components";

const MyScreen = () => {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const signOut = useSignOut();
  const isWaiting =
    currentUser.authStatus === "loading" ||
    currentUser.authStatus === "offline";

  return (
    <View style={s.container}>
      <TitleHeader title="마이">
        {currentUser.authStatus === "authenticated" ? (
          <ActionButtonGroup
            actions={[
              {
                accessibilityLabel: "주문 내역",
                icon: { md: "menu", sf: "list.bullet.rectangle" },
                onPress: () => router.push("/orders"),
              },
              {
                accessibilityLabel: "장바구니",
                icon: { md: "shopping_cart", sf: "cart" },
                onPress: () => router.push("/cart"),
              },
            ]}
            variant="circularPair"
          />
        ) : null}
      </TitleHeader>
      {currentUser.authStatus === "authenticated" && currentUser.data ? (
        <View style={s.account}>
          <Text style={s.accountId}>{currentUser.data.userid}</Text>
          <Text style={s.stateDescription}>{currentUser.data.email}</Text>
          <Button label="로그아웃" onPress={() => void signOut()} />
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
          <Text style={s.stateTitle}>로그인이 필요해요.</Text>
          <Text style={s.stateDescription}>
            로그인하면 주문과 계정 정보를 확인할 수 있어요.
          </Text>
          <Button label="로그인" onPress={() => router.push("/auth")} />
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
