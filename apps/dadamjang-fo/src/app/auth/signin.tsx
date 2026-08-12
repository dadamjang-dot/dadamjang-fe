import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { useSignIn } from "@/features/auth";

const SigninScreen = () => {
  const router = useRouter();
  const signIn = useSignIn();
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();

  const handleSubmit = () => {
    const normalizedUserid = userid.trim();
    if (!normalizedUserid || !password) {
      setMessage("아이디와 비밀번호를 입력해 주세요.");
      return;
    }

    setMessage(undefined);
    signIn.mutate(
      { userid: normalizedUserid, password },
      {
        onError: () => setMessage("로그인에 실패했어요."),
        onSuccess: () => router.replace("/"),
      },
    );
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>로그인</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setUserid}
        placeholder="아이디"
        style={s.input}
        testID="e2e.auth.userid.input"
        value={userid}
      />
      <TextInput
        onChangeText={setPassword}
        onSubmitEditing={handleSubmit}
        placeholder="비밀번호"
        secureTextEntry
        style={s.input}
        testID="e2e.auth.password.input"
        value={password}
      />
      {message ? <Text style={s.message}>{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={signIn.isPending}
        onPress={handleSubmit}
        style={s.submit}
        testID="e2e.auth.submit"
      >
        <Text style={s.submitLabel}>{signIn.isPending ? "로그인 중" : "로그인"}</Text>
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.surface,
  },
  title: {
    marginBottom: 12,
    color: colors.ink,
    fontSize: 28,
    fontWeight: "700",
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    color: colors.ink,
  },
  message: {
    color: colors.danger,
    fontSize: 13,
  },
  submit: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  submitLabel: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700",
  },
});

export default SigninScreen;
