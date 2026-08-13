import { KeyboardAvoidingView, ScrollView, type ViewStyle } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { ReactNode } from "react";

import { colors, spacing } from "@dadamjang/design-tokens";

type AuthScreenProps = {
  children: ReactNode;
  centered?: boolean;
  contentStyle?: ViewStyle;
  testID?: string;
};

export const AuthScreen = ({
  children,
  centered = false,
  contentStyle,
  testID,
}: AuthScreenProps) => (
  <KeyboardAvoidingView
    behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
    keyboardVerticalOffset={process.env.EXPO_OS === "ios" ? 88 : 0}
    style={s.screen}
  >
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[s.content, centered && s.centered, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={s.scroll}
      testID={testID}
    >
      {children}
    </ScrollView>
  </KeyboardAvoidingView>
);

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  centered: { justifyContent: "center" },
});
