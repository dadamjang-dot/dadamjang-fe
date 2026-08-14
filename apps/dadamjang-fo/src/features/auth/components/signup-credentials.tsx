import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import type { KakaoSignupContext } from "../types";
import { AuthField } from "./auth-field";
import { EmailVerificationFields } from "./email-verification-fields";

type SignupCredentialsProps = {
  kakaoSignup?: KakaoSignupContext;
  email: string;
  onEmailChange: (email: string) => void;
  emailVerificationToken?: string;
  onEmailVerified: (token?: string) => void;
  requestCode: (email: string) => Promise<unknown>;
  verifyCode: (input: { email: string; code: string }) => Promise<{ emailVerificationToken: string }>;
  password: string;
  onPasswordChange: (password: string) => void;
  passwordConfirmation: string;
  onPasswordConfirmationChange: (password: string) => void;
};

export const SignupCredentials = ({
  kakaoSignup,
  email,
  onEmailChange,
  emailVerificationToken,
  onEmailVerified,
  requestCode,
  verifyCode,
  password,
  onPasswordChange,
  passwordConfirmation,
  onPasswordConfirmationChange,
}: SignupCredentialsProps) => {
  const emailNeedsVerification = !kakaoSignup || kakaoSignup.emailVerificationRequired;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>계정 정보</Text>
      {emailNeedsVerification ? (
        <EmailVerificationFields
          email={email}
          onEmailChange={onEmailChange}
          onVerified={onEmailVerified}
          requestCode={requestCode}
          testIDPrefix="e2e.auth.signup"
          verificationToken={emailVerificationToken}
          verifyCode={verifyCode}
        />
      ) : (
        <AuthField
          editable={false}
          helper="카카오에서 확인한 이메일이에요."
          label="이메일 주소"
          testID="e2e.auth.signup.email"
          value={email}
        />
      )}
      {!kakaoSignup ? (
        <>
          <AuthField
            autoComplete="new-password"
            helper="8자 이상, 72바이트 이하"
            label="비밀번호"
            onChangeText={onPasswordChange}
            secureTextEntry
            testID="e2e.auth.signup.password"
            textContentType="newPassword"
            value={password}
          />
          <AuthField
            error={
              passwordConfirmation && password !== passwordConfirmation
                ? "비밀번호가 서로 달라요."
                : undefined
            }
            label="비밀번호 재입력"
            onChangeText={onPasswordConfirmationChange}
            secureTextEntry
            testID="e2e.auth.signup.password-confirmation"
            textContentType="newPassword"
            value={passwordConfirmation}
          />
        </>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  section: { gap: spacing.lg },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
});
