import { type ReactNode } from "react";
import {
  Pressable,
  Text,
  type PressableProps,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

type ButtonProps = Pick<
  PressableProps,
  | "accessibilityLabel"
  | "accessibilityRole"
  | "accessibilityState"
  | "disabled"
  | "hitSlop"
  | "testID"
> & {
  children?: ReactNode;
  label?: string;
  onPress: NonNullable<PressableProps["onPress"]>;
  style?: PressableProps["style"];
  variant?: "bare" | "primary" | "secondary";
};

const Button = ({
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  children,
  disabled = false,
  hitSlop,
  label,
  onPress,
  style,
  testID,
  variant = "primary",
}: ButtonProps) => (
  <Pressable
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityRole={accessibilityRole ?? "button"}
    accessibilityState={accessibilityState ?? { disabled: Boolean(disabled) }}
    disabled={Boolean(disabled)}
    hitSlop={hitSlop}
    onPress={Boolean(disabled) ? undefined : onPress}
    style={(state) => [
      variant !== "bare" && s.button,
      variant === "secondary" && s.secondaryButton,
      typeof style === "function" ? style(state) : style,
      disabled && s.disabled,
      state.pressed && !disabled && variant !== "bare" && s.pressed,
    ]}
    testID={testID}
  >
    {children ?? (
      <Text style={[s.label, variant === "secondary" && s.secondaryLabel]}>
        {label}
      </Text>
    )}
  </Pressable>
);

const s = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.ink,
  },
  disabled: {
    opacity: 0.4,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryLabel: {
    color: colors.ink,
  },
});

export { Button };
export type { ButtonProps };
