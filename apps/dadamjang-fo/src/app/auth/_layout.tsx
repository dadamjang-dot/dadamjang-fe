import { Redirect, Stack, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";
import { ActionButton, type Action } from "@dadamjang/mobile";

import { useCurrentUser } from "@/features/auth";
import { Button } from "@/shared/components";

const AuthLayout = () => {
  const router = useRouter();
  const { authStatus, data: currentUser, retryAuth } = useCurrentUser();

  const close = () => {
    if (router.canDismiss()) router.dismiss();
    else router.replace("/");
  };

  if (authStatus === "authenticated" && currentUser)
    return <Redirect href="/" />;
  if (authStatus === "error") {
    return (
      <View style={s.errorContainer}>
        <Text accessibilityRole="alert" style={s.errorTitle}>
          로그인 정보를 불러오지 못했어요.
        </Text>
        <Text style={s.errorDescription}>
          저장된 로그인 정보를 확인한 뒤 다시 시도해 주세요.
        </Text>
        <View style={s.errorActions}>
          <Button label="다시 시도" onPress={() => void retryAuth()} />
          <Button label="닫기" onPress={close} variant="secondary" />
        </View>
      </View>
    );
  }
  if (authStatus !== "unauthenticated") return null;

  const closeAction: Action = {
    accessibilityLabel: "닫기",
    icon: { md: "close", sf: "xmark" },
    iconSize: 18,
    onPress: close,
  };

  const renderCloseAction = () => (
    <ActionButton actions={[closeAction]} iconOnly />
  );

  const renderCloseItems = () => [
    {
      type: "custom" as const,
      element: <View style={s.iosHeaderAction}>{renderCloseAction()}</View>,
      hidesSharedBackground: true,
    },
  ];

  const childOptions =
    (title: string) =>
    ({ navigation }: { navigation: { canGoBack: () => boolean } }) => {
      const showClose = !navigation.canGoBack();

      return {
        title,
        headerRight: showClose ? renderCloseAction : undefined,
        unstable_headerRightItems: showClose ? renderCloseItems : undefined,
      };
    };

  return (
    <Stack
      screenOptions={{
        gestureEnabled: true,
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: {
          color: colors.ink,
          fontSize: 17,
          fontWeight: "700",
        },
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "",
          headerRight: renderCloseAction,
          unstable_headerRightItems: renderCloseItems,
        }}
      />
      <Stack.Screen name="signin" options={childOptions("이메일로 시작하기")} />
      <Stack.Screen name="signup" options={childOptions("가입하기")} />
      <Stack.Screen name="find-email" options={childOptions("이메일 찾기")} />
      <Stack.Screen
        name="find-password"
        options={childOptions("비밀번호 찾기")}
      />
      <Stack.Screen name="reactivate" options={childOptions("계정 복구")} />
      <Stack.Screen
        name="terms/[document-id]"
        options={childOptions("약관 상세")}
      />
      <Stack.Screen name="kakao-callback" options={{ headerShown: false }} />
      <Stack.Screen name="identity-callback" options={{ headerShown: false }} />
    </Stack>
  );
};

const s = StyleSheet.create({
  errorActions: { width: "100%", gap: spacing.sm },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  errorDescription: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  errorTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  iosHeaderAction: { transform: [{ translateX: 4 }, { translateY: 6 }] },
});

export default AuthLayout;
