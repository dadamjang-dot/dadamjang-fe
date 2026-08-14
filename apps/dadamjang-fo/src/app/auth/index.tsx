import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useQueryClient } from "@tanstack/react-query";

import { colors, spacing } from "@dadamjang/design-tokens";

import {
  AuthSessionCancelledError,
  authErrorMessage,
  authQueryKeys,
  resolveAuthReturnTo,
  runKakaoLoginSession,
  useAuthFlow,
} from "@/features/auth";
import { AuthLinks, AuthScreen } from "@/features/auth/components";
import { Button } from "@/shared/components/button";

const AuthScreenRoute = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { setKakaoSignup } = useAuthFlow();
  const [isKakaoPending, setIsKakaoPending] = useState(false);
  const [message, setMessage] = useState<string>();

  const handleKakao = async () => {
    if (isKakaoPending) return;
    setIsKakaoPending(true);
    setMessage(undefined);
    try {
      const result = await runKakaoLoginSession();
      if (result.status === "SIGNED_IN") {
        await queryClient.invalidateQueries({ queryKey: authQueryKeys.viewer });
        router.replace(resolveAuthReturnTo(returnTo) as Href);
        return;
      }
      if (!result.kakaoSignupToken) throw new Error("카카오 가입 정보를 확인하지 못했어요.");
      setKakaoSignup({
        kakaoSignupToken: result.kakaoSignupToken,
        email: result.email ?? undefined,
        emailVerificationRequired: result.emailVerificationRequired,
      });
      router.push({
        pathname: "/auth/signup",
        params: { mode: "kakao", ...(returnTo ? { returnTo } : {}) },
      });
    } catch (error) {
      setMessage(
        authErrorMessage(
          error,
          error instanceof AuthSessionCancelledError
            ? "카카오 로그인을 취소했어요."
            : "카카오 로그인에 실패했어요.",
        ),
      );
    } finally {
      setIsKakaoPending(false);
    }
  };

  const authParams = returnTo ? { returnTo } : undefined;

  return (
    <AuthScreen centered testID="e2e.auth.home">
      <View style={s.content}>
        <View style={s.intro}>
          <Text style={s.heading}>다담장에 오신 걸 환영해요.</Text>
          <Text style={s.description}>로그인하면 주문 내역과 위시한 상품을 한곳에서 볼 수 있어요.</Text>
        </View>
        <View style={s.actions}>
          <Button
            accessibilityLabel={isKakaoPending ? "카카오 연결 중" : "카카오로 시작하기"}
            disabled={isKakaoPending}
            onPress={handleKakao}
            style={s.kakaoButton}
            testID="e2e.auth.kakao"
          >
            <Text style={s.kakaoLabel}>
              {isKakaoPending ? "카카오 연결 중" : "카카오로 시작하기"}
            </Text>
          </Button>
          <Button
            label="이메일로 시작하기"
            onPress={() => router.push({ pathname: "/auth/signin", params: authParams })}
            testID="e2e.auth.open-signin"
            variant="secondary"
          />
          <Button
            label="가입하기"
            onPress={() => router.push({ pathname: "/auth/signup", params: authParams })}
            style={s.signupButton}
            testID="e2e.auth.open-signup"
            variant="bare"
          />
        </View>
        {message ? (
          <Text accessibilityRole="alert" style={s.message}>
            {message}
          </Text>
        ) : null}
        <AuthLinks
          onFindEmail={() => router.push("/auth/find-email")}
          onFindPassword={() => router.push("/auth/find-password")}
        />
      </View>
    </AuthScreen>
  );
};

const s = StyleSheet.create({
  content: { gap: spacing.xl },
  intro: { gap: spacing.sm },
  heading: { color: colors.ink, fontSize: 22, fontWeight: "800", lineHeight: 30 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  actions: { gap: spacing.md },
  kakaoButton: { backgroundColor: colors.kakao },
  kakaoLabel: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  signupButton: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  message: { color: colors.danger, fontSize: 13, lineHeight: 18, textAlign: "center" },
});

export default AuthScreenRoute;
