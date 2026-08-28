import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import {
  IdentitySheetDismissedError,
  authErrorMessage,
  useAuthFlow,
  useFindFoEmail,
} from "@/features/auth";
import { AuthScreen } from "@/features/auth/components";
import { Button } from "@/shared/components/button";

const FindEmailScreen = () => {
  const router = useRouter();
  const { openIdentityProviderSheet } = useAuthFlow();
  const findEmail = useFindFoEmail();
  const [maskedEmail, setMaskedEmail] = useState<string>();
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState<string>();

  const handleVerify = async () => {
    setMessage(undefined);
    setNotFound(false);
    try {
      const identityToken = await openIdentityProviderSheet("FIND_EMAIL");
      const result = await findEmail.mutateAsync(identityToken);
      setMaskedEmail(result.maskedEmail ?? undefined);
      setNotFound(!result.found);
    } catch (error) {
      if (!(error instanceof IdentitySheetDismissedError))
        setMessage(authErrorMessage(error, "이메일을 찾지 못했습니다."));
    }
  };

  return (
    <AuthScreen centered testID="e2e.auth.find-email">
      <View style={s.content}>
        {maskedEmail ? (
          <View style={s.result}>
            <Text style={s.eyebrow}>가입한 이메일</Text>
            <Text
              accessibilityLabel={`가입한 이메일 ${maskedEmail}`}
              style={s.email}
            >
              {maskedEmail}
            </Text>
            <Button
              label="이메일로 로그인"
              onPress={() => router.replace("/auth/signin")}
            />
          </View>
        ) : (
          <>
            <View style={s.intro}>
              <Text style={s.heading}>본인 인증으로 이메일을 찾아요.</Text>
              <Text style={s.description}>
                가입할 때 입력한 정보와 일치하는 이메일을 일부 가려서
                보여드려요.
              </Text>
            </View>
            <Button
              disabled={findEmail.isPending}
              label={findEmail.isPending ? "확인 중" : "본인 인증"}
              onPress={handleVerify}
              testID="e2e.auth.find-email.identity"
            />
            {notFound ? (
              <Text style={s.message}>가입된 이메일을 찾지 못했습니다.</Text>
            ) : null}
          </>
        )}
        {message ? (
          <Text accessibilityRole="alert" style={s.message}>
            {message}
          </Text>
        ) : null}
      </View>
    </AuthScreen>
  );
};

const s = StyleSheet.create({
  content: { gap: spacing.xl },
  intro: { gap: spacing.sm },
  heading: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 28,
  },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  result: { gap: spacing.lg, alignItems: "stretch" },
  eyebrow: { color: colors.muted, fontSize: 13, textAlign: "center" },
  email: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});

export default FindEmailScreen;
