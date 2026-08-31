import { Alert, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components/button";

type AuthLinksProps = {
  onFindEmail: () => void;
  onFindPassword: () => void;
};

const passwordResetWarning =
  "이메일로 가입한 계정만 비밀번호를 재설정할 수 있어요. 카카오로 가입했다면 카카오 로그인을 이용해 주세요.";

export const AuthLinks = ({ onFindEmail, onFindPassword }: AuthLinksProps) => {
  const openPasswordReset = () =>
    Alert.alert("비밀번호 찾기", passwordResetWarning, [
      { text: "취소", style: "cancel" },
      { text: "이메일 계정 계속", onPress: onFindPassword },
    ]);

  return (
    <View style={s.links}>
      <Button
        accessibilityLabel="이메일 찾기"
        onPress={onFindEmail}
        style={s.link}
        variant="bare"
      >
        <Text style={s.linkLabel}>이메일 찾기</Text>
      </Button>
      <Text accessibilityElementsHidden style={s.separator}>
        |
      </Text>
      <Button
        accessibilityLabel="비밀번호 찾기"
        onPress={openPasswordReset}
        style={s.link}
        variant="bare"
      >
        <Text style={s.linkLabel}>비밀번호 찾기</Text>
      </Button>
    </View>
  );
};

const s = StyleSheet.create({
  links: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  link: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  linkLabel: { color: colors.muted, fontSize: 15, fontWeight: "400" },
  separator: { color: colors.line, fontSize: 13 },
});
