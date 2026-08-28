import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { useAuthFlow } from "@/features/auth/auth-flow-provider";
import {
  AuthSessionCancelledError,
  runIdentityVerificationSession,
} from "@/features/auth/auth-session";
import { authErrorMessage } from "@/features/auth/rules";
import type { IdentityVerificationProvider } from "@/features/auth/types";
import { Button } from "@/shared/components/button";

const providers: {
  id: IdentityVerificationProvider;
  label: string;
  description: string;
}[] = [
  { id: "TOSS", label: "토스 인증", description: "토스 인증서로 본인 확인" },
  {
    id: "KAKAO",
    label: "카카오 인증",
    description: "카카오 인증서로 본인 확인",
  },
  {
    id: "NAVER",
    label: "네이버 인증",
    description: "네이버 인증서로 본인 확인",
  },
];

const IdentityProviderSheetRoute = () => {
  const router = useRouter();
  const { identityRequest, completeIdentityRequest, cancelIdentityRequest } =
    useAuthFlow();
  const settled = useRef(false);
  const [pendingProvider, setPendingProvider] =
    useState<IdentityVerificationProvider>();
  const [message, setMessage] = useState<string>();

  useEffect(
    () => () => {
      if (!settled.current) cancelIdentityRequest();
    },
    [cancelIdentityRequest],
  );

  const handleProvider = async (provider: IdentityVerificationProvider) => {
    if (!identityRequest || pendingProvider) return;
    setPendingProvider(provider);
    setMessage(undefined);
    try {
      const token = await runIdentityVerificationSession(
        identityRequest.purpose,
        provider,
      );
      settled.current = true;
      completeIdentityRequest(token);
      router.back();
    } catch (error) {
      setMessage(
        authErrorMessage(
          error,
          error instanceof AuthSessionCancelledError
            ? "본인 인증을 취소했어요."
            : "본인 인증에 실패했어요.",
        ),
      );
    } finally {
      if (!settled.current) setPendingProvider(undefined);
    }
  };

  return (
    <View style={s.screen} testID="e2e.auth.identity-provider-sheet">
      <View style={s.heading}>
        <Text style={s.title}>본인 인증</Text>
        <Text style={s.description}>사용할 인증서를 선택해 주세요.</Text>
      </View>
      <View style={s.providers}>
        {providers.map((provider) => (
          <Button
            key={provider.id}
            disabled={Boolean(pendingProvider)}
            onPress={() => handleProvider(provider.id)}
            style={s.provider}
            testID={`e2e.auth.identity.${provider.id.toLowerCase()}`}
            variant="bare"
          >
            <View style={s.providerText}>
              <Text style={s.providerLabel}>
                {pendingProvider === provider.id
                  ? "인증 여는 중"
                  : provider.label}
              </Text>
              <Text style={s.providerDescription}>{provider.description}</Text>
            </View>
            <Text style={s.disclosure}>›</Text>
          </Button>
        ))}
      </View>
      {message ? (
        <Text accessibilityRole="alert" style={s.message}>
          {message}
        </Text>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: colors.surface,
  },
  heading: { gap: spacing.sm, marginBottom: spacing.lg },
  title: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  description: { color: colors.muted, fontSize: 14 },
  providers: { borderTopWidth: 1, borderTopColor: colors.line },
  provider: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  providerText: { gap: spacing.xs },
  providerLabel: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  providerDescription: { color: colors.muted, fontSize: 12 },
  disclosure: { color: colors.muted, fontSize: 24 },
  message: { marginTop: spacing.md, color: colors.danger, fontSize: 13 },
});

export default IdentityProviderSheetRoute;
