import { useEffect, useRef, useState } from "react";
import { Text, TextInput } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { authErrorMessage, validateEmail } from "../rules";
import { AuthField } from "./auth-field";

type VerificationPayload = { emailVerificationToken: string };

type EmailVerificationFieldsProps = {
  email: string;
  onEmailChange: (email: string) => void;
  verificationToken?: string;
  onVerified: (token?: string) => void;
  requestCode: (email: string) => Promise<unknown>;
  verifyCode: (input: { email: string; code: string }) => Promise<VerificationPayload>;
  testIDPrefix: string;
};

export const EmailVerificationFields = ({
  email,
  onEmailChange,
  verificationToken,
  onVerified,
  requestCode,
  verifyCode,
  testIDPrefix,
}: EmailVerificationFieldsProps) => {
  const codeRef = useRef<TextInput>(null);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1_000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleEmailChange = (value: string) => {
    onEmailChange(value);
    onVerified(undefined);
    setCode("");
    setCodeSent(false);
    setCooldown(0);
    setMessage(undefined);
  };

  const handleRequest = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      setMessage(emailError);
      return;
    }
    setIsRequesting(true);
    setMessage(undefined);
    try {
      await requestCode(normalizedEmail);
      setCodeSent(true);
      setCooldown(60);
      setMessage("인증번호를 보냈어요.");
      requestAnimationFrame(() => codeRef.current?.focus());
    } catch (error) {
      setMessage(authErrorMessage(error, "인증번호를 보내지 못했어요."));
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/u.test(code)) {
      setMessage("6자리 인증번호를 입력해 주세요.");
      return;
    }
    setIsVerifying(true);
    setMessage(undefined);
    try {
      const result = await verifyCode({ email: email.trim().toLowerCase(), code });
      onVerified(result.emailVerificationToken);
      setMessage("이메일 인증을 마쳤어요.");
    } catch (error) {
      setMessage(authErrorMessage(error, "인증번호가 맞지 않아요."));
    } finally {
      setIsVerifying(false);
    }
  };

  const requestLabel = verificationToken
    ? "인증 완료"
    : cooldown > 0
      ? `${cooldown}초`
      : codeSent
        ? "다시 받기"
        : "인증번호 받기";

  return (
    <>
      <AuthField
        actionDisabled={Boolean(verificationToken) || cooldown > 0 || isRequesting}
        actionLabel={isRequesting ? "보내는 중" : requestLabel}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        label="이메일 주소"
        onAction={handleRequest}
        onChangeText={handleEmailChange}
        testID={`${testIDPrefix}.email`}
        textContentType="emailAddress"
        value={email}
      />
      {codeSent && !verificationToken ? (
        <AuthField
          ref={codeRef}
          actionDisabled={isVerifying}
          actionLabel={isVerifying ? "확인 중" : "확인"}
          keyboardType="number-pad"
          label="인증번호"
          maxLength={6}
          onAction={handleVerify}
          onChangeText={setCode}
          onSubmitEditing={handleVerify}
          testID={`${testIDPrefix}.code`}
          value={code}
        />
      ) : null}
      {message ? (
        <Text
          accessibilityRole={verificationToken ? undefined : "alert"}
          style={[s.message, verificationToken && s.success]}
        >
          {message}
        </Text>
      ) : null}
    </>
  );
};

const s = StyleSheet.create({
  message: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  success: { color: colors.ink, fontWeight: "600" },
});
