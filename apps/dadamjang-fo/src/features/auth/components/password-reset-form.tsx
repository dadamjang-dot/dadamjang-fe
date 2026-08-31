import { useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import {
  authErrorMessage,
  useRequestPasswordResetCode,
  useResetPassword,
  useVerifyPasswordResetCode,
  validatePassword,
} from "@/features/auth";
import { Button } from "@/shared/components/button";

import { AuthField } from "./auth-field";
import { EmailVerificationFields } from "./email-verification-fields";

type PasswordResetFormProps = {
  emailEditable?: boolean;
  initialEmail?: string;
  onComplete: () => void;
};

export const PasswordResetForm = ({
  emailEditable = true,
  initialEmail = "",
  onComplete,
}: PasswordResetFormProps) => {
  const requestCode = useRequestPasswordResetCode();
  const verifyCode = useVerifyPasswordResetCode();
  const resetPassword = useResetPassword();
  const [email, setEmail] = useState(initialEmail);
  const [verificationToken, setVerificationToken] = useState<string>();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState<string>();

  const handleReset = async () => {
    const passwordError = validatePassword(password);
    if (passwordError) {
      setMessage(passwordError);
      return;
    }
    if (password !== passwordConfirmation) {
      setMessage("비밀번호가 서로 달라요.");
      return;
    }
    if (!verificationToken) return;
    setMessage(undefined);
    try {
      await resetPassword.mutateAsync({ token: verificationToken, password });
      onComplete();
    } catch (error) {
      setMessage(authErrorMessage(error, "비밀번호를 변경하지 못했어요."));
    }
  };

  return (
    <View style={s.form}>
      <Text style={s.description}>
        가입한 이메일을 인증하고 새 비밀번호를 설정해요. 안전을 위해 가입 여부와
        관계없이 같은 결과를 안내해요.
      </Text>
      {!verificationToken ? (
        <EmailVerificationFields
          email={email}
          emailEditable={emailEditable}
          onEmailChange={setEmail}
          onVerified={setVerificationToken}
          requestCode={(nextEmail) => requestCode.mutateAsync(nextEmail)}
          testIDPrefix="e2e.auth.password-reset"
          verificationToken={verificationToken}
          verifyCode={(input) => verifyCode.mutateAsync(input)}
        />
      ) : (
        <>
          <AuthField
            autoComplete="new-password"
            helper="8자 이상, 72바이트 이하"
            label="새 비밀번호"
            onChangeText={setPassword}
            secureTextEntry
            testID="e2e.auth.password-reset.password"
            textContentType="newPassword"
            value={password}
          />
          <AuthField
            error={
              passwordConfirmation && password !== passwordConfirmation
                ? "비밀번호가 서로 달라요."
                : undefined
            }
            label="새 비밀번호 재입력"
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            testID="e2e.auth.password-reset.password-confirmation"
            textContentType="newPassword"
            value={passwordConfirmation}
          />
          <Button
            disabled={resetPassword.isPending}
            label={resetPassword.isPending ? "변경 중" : "비밀번호 변경"}
            onPress={handleReset}
            testID="e2e.auth.password-reset.submit"
          />
        </>
      )}
      {message ? (
        <Text accessibilityRole="alert" style={s.message}>
          {message}
        </Text>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  form: { gap: spacing.lg },
  description: {
    marginBottom: spacing.sm,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  message: { color: colors.danger, fontSize: 13, lineHeight: 18 },
});
