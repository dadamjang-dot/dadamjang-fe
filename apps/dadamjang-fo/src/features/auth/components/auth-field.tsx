import { forwardRef, type ReactNode } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components/button";

type AuthFieldProps = Omit<TextInputProps, "style"> & {
  label: string;
  error?: string;
  helper?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  leading?: ReactNode;
};

export const AuthField = forwardRef<TextInput, AuthFieldProps>(
  (
    {
      label,
      error,
      helper,
      actionLabel,
      actionDisabled,
      onAction,
      leading,
      editable = true,
      ...inputProps
    },
    ref,
  ) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View
        style={[
          s.inputFrame,
          error && s.inputFrameError,
          !editable && s.disabledFrame,
        ]}
      >
        {leading}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          editable={editable}
          placeholderTextColor={colors.muted}
          style={s.input}
          {...inputProps}
        />
        {actionLabel && onAction ? (
          <Button
            disabled={actionDisabled}
            label={actionLabel}
            onPress={onAction}
            style={s.action}
            variant="secondary"
          />
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : helper ? (
        <Text style={s.helper}>{helper}</Text>
      ) : null}
    </View>
  ),
);

AuthField.displayName = "AuthField";

const s = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  inputFrame: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  inputFrameError: { borderColor: colors.danger },
  disabledFrame: { backgroundColor: colors.primarySoft },
  input: {
    minWidth: 0,
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.ink,
    fontSize: 16,
  },
  action: { minHeight: 34, paddingHorizontal: spacing.md, borderRadius: 6 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
