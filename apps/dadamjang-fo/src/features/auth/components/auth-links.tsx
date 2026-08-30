import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components/button";

type AuthLinksProps = {
  onFindEmail: () => void;
  onFindPassword: () => void;
};

export const AuthLinks = ({ onFindEmail, onFindPassword }: AuthLinksProps) => (
  <View style={s.links}>
    <Button
      label="이메일 찾기"
      onPress={onFindEmail}
      style={s.link}
      variant="bare"
    />
    <Text accessibilityElementsHidden style={s.separator}>
      |
    </Text>
    <Button
      label="비밀번호 찾기"
      onPress={onFindPassword}
      style={s.link}
      variant="bare"
    />
  </View>
);

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
  separator: { color: colors.line, fontSize: 13 },
});
