import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";
import { resetAuthSession } from "@dadamjang/graphql-client";

import { useAuthActionGate } from "@/features/auth";
import { PasswordResetForm } from "@/features/auth/components";
import { Button } from "@/shared/components/button";
import { TitleHeader } from "@/shared/components/title-header";

const PasswordChangeScreen = () => {
  const router = useRouter();
  const auth = useAuthActionGate("/settings/password");
  const { authStatus, redirectToSignIn } = auth;

  useEffect(() => {
    if (authStatus === "unauthenticated") redirectToSignIn(true);
  }, [authStatus, redirectToSignIn]);

  const complete = async () => {
    await resetAuthSession();
    router.replace("/auth/signin");
  };

  return (
    <ScrollView
      contentContainerStyle={s.content}
      contentInsetAdjustmentBehavior="automatic"
      style={s.container}
    >
      <TitleHeader title="비밀번호 변경" />
      {auth.authStatus === "loading" || auth.authStatus === "offline" ? (
        <Text style={s.state}>로그인 상태를 확인하고 있어요.</Text>
      ) : auth.authStatus === "error" ? (
        <View style={s.stateGroup}>
          <Text accessibilityRole="alert" selectable style={s.state}>
            로그인 상태를 확인하지 못했어요.
          </Text>
          <Button
            label="다시 시도"
            onPress={() => void auth.retryAuth()}
            variant="secondary"
          />
        </View>
      ) : auth.isAuthenticated && auth.data?.hasPassword ? (
        <View style={s.form}>
          <PasswordResetForm
            emailEditable={false}
            initialEmail={auth.data.email}
            onComplete={() => void complete()}
          />
        </View>
      ) : auth.isAuthenticated ? (
        <View style={s.stateGroup}>
          <Text style={s.state}>비밀번호를 변경할 수 없는 계정이에요.</Text>
          <Button
            label="설정으로 돌아가기"
            onPress={() => router.replace("/settings")}
            variant="secondary"
          />
        </View>
      ) : (
        <Text style={s.state}>로그인 화면으로 이동하고 있어요.</Text>
      )}
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  form: { paddingHorizontal: spacing.xl },
  stateGroup: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  state: { padding: spacing.xl, color: colors.muted, textAlign: "center" },
});

export default PasswordChangeScreen;
