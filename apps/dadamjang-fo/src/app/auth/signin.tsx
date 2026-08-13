import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { resolveAuthReturnTo, useSignIn, validateEmail } from "@/features/auth";
import { AuthField, AuthLinks, AuthScreen } from "@/features/auth/components";
import { Button } from "@/shared/components/button";

const SigninScreen = () => {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const signIn = useSignIn();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();

  const handleSubmit = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setMessage("이메일과 비밀번호를 입력해 주세요.");
      (normalizedEmail ? passwordRef : emailRef).current?.focus();
      return;
    }
    if (validateEmail(normalizedEmail)) {
      setMessage("올바른 이메일 주소를 입력해 주세요.");
      emailRef.current?.focus();
      return;
    }
    setMessage(undefined);
    signIn.mutate(
      { email: normalizedEmail, password },
      {
        onError: () => setMessage("이메일 또는 비밀번호가 올바르지 않습니다."),
        onSuccess: () => router.replace(resolveAuthReturnTo(returnTo) as Href),
      },
    );
  };

  return (
    <AuthScreen testID="e2e.auth.signin">
      <View style={s.form}>
        <Text style={s.intro}>가입한 이메일과 비밀번호를 입력해 주세요.</Text>
        <AuthField
          ref={emailRef}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          label="이메일"
          onChangeText={setEmail}
          onSubmitEditing={() => passwordRef.current?.focus()}
          returnKeyType="next"
          testID="e2e.auth.email.input"
          textContentType="emailAddress"
          value={email}
        />
        <AuthField
          ref={passwordRef}
          autoComplete="current-password"
          label="비밀번호"
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          secureTextEntry
          testID="e2e.auth.password.input"
          textContentType="password"
          value={password}
        />
        {message ? (
          <Text accessibilityRole="alert" style={s.message}>
            {message}
          </Text>
        ) : null}
        <Button
          disabled={signIn.isPending}
          label={signIn.isPending ? "로그인 중" : "로그인"}
          onPress={handleSubmit}
          testID="e2e.auth.submit"
        />
        <AuthLinks
          onFindEmail={() => router.push("/auth/find-email")}
          onFindPassword={() => router.push("/auth/find-password")}
        />
      </View>
    </AuthScreen>
  );
};

const s = StyleSheet.create({
  form: { gap: spacing.lg },
  intro: { marginBottom: spacing.sm, color: colors.muted, fontSize: 14, lineHeight: 20 },
  message: { color: colors.danger, fontSize: 13, lineHeight: 18 },
});

export default SigninScreen;
