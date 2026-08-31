import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { useAuthFlow, useReactivateFoAccount } from "@/features/auth";
import { AuthScreen } from "@/features/auth/components";
import { Button } from "@/shared/components/button";

const ReactivateScreen = () => {
  const router = useRouter();
  const reactivate = useReactivateFoAccount();
  const { pendingReactivation, clearPendingReactivation } = useAuthFlow();
  const [message, setMessage] = useState<string>();

  useEffect(() => () => clearPendingReactivation(), [clearPendingReactivation]);

  const returnToAuth = () => {
    clearPendingReactivation();
    router.replace("/auth");
  };

  const handleReactivate = async () => {
    if (!pendingReactivation) return;
    const { reactivationToken, returnTo } = pendingReactivation;
    setMessage(undefined);
    try {
      await reactivate.mutateAsync(reactivationToken);
      clearPendingReactivation();
      router.replace(returnTo as Href);
    } catch {
      clearPendingReactivation();
      setMessage("계정을 복구하지 못했어요. 다시 로그인해 주세요.");
    }
  };

  if (!pendingReactivation) {
    return (
      <AuthScreen centered testID="e2e.auth.reactivate">
        <View style={s.content}>
          <Text
            accessibilityRole={message ? "alert" : undefined}
            style={s.message}
          >
            {message ?? "복구 요청이 만료되었어요. 다시 로그인해 주세요."}
          </Text>
          <Button label="로그인으로 돌아가기" onPress={returnToAuth} />
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen centered testID="e2e.auth.reactivate">
      <View style={s.content}>
        <View style={s.copy}>
          <Text style={s.title}>계정을 다시 사용할까요?</Text>
          <Text style={s.description}>
            복구하면 이전 계정과 주문 내역을 다시 사용할 수 있어요.
          </Text>
        </View>
        <View style={s.actions}>
          <Button
            disabled={reactivate.isPending}
            label={reactivate.isPending ? "복구 중" : "계정 복구"}
            onPress={handleReactivate}
          />
          <Button label="취소" onPress={returnToAuth} variant="secondary" />
        </View>
      </View>
    </AuthScreen>
  );
};

const s = StyleSheet.create({
  content: { gap: spacing.xl },
  copy: { gap: spacing.sm },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 30,
    textAlign: "center",
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  actions: { gap: spacing.md },
  message: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});

export default ReactivateScreen;
