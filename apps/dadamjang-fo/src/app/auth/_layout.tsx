import { Redirect, Stack, useRouter } from "expo-router";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";
import { ActionButton, type Action } from "@dadamjang/mobile";

import { useCurrentUser } from "@/features/auth";

const AuthLayout = () => {
  const router = useRouter();
  const { data: currentUser, isPending } = useCurrentUser();

  if (isPending) return null;
  if (currentUser) return <Redirect href="/" />;

  const close = () => {
    if (router.canDismiss()) router.dismiss();
    else router.replace("/");
  };

  const closeAction: Action = {
    accessibilityLabel: "닫기",
    icon: { md: "close", sf: "xmark" },
    iconSize: 18,
    onPress: close,
  };

  const renderCloseAction = () => <ActionButton actions={[closeAction]} iconOnly />;

  const renderCloseItems = () => [
    {
      type: "custom" as const,
      element: <View style={s.iosHeaderAction}>{renderCloseAction()}</View>,
      hidesSharedBackground: true,
    },
  ];

  const childOptions = (title: string) =>
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
        headerTitleStyle: { color: colors.ink, fontSize: 17, fontWeight: "700" },
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
      <Stack.Screen name="find-password" options={childOptions("비밀번호 찾기")} />
      <Stack.Screen name="terms/[document-id]" options={childOptions("약관 상세")} />
      <Stack.Screen name="kakao-callback" options={{ headerShown: false }} />
      <Stack.Screen name="identity-callback" options={{ headerShown: false }} />
    </Stack>
  );
};

const s = StyleSheet.create({
  iosHeaderAction: { transform: [{ translateX: 4 }, { translateY: 6 }] },
});

export default AuthLayout;
