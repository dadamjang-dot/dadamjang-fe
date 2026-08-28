import { LiquidGlassView } from "@callstack/liquid-glass";
import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";
import type {
  Action,
  ActionButtonProps as BaseActionButtonProps,
} from "./action-button.types";

export type ActionButtonProps = BaseActionButtonProps;

interface ActionButtonContentProps {
  action: Action;
  iconOnly?: boolean;
}

export const ActionButtonContent = ({
  action,
  iconOnly,
}: ActionButtonContentProps) => {
  const isIconOnly = Boolean(iconOnly && action.icon && !action.label);

  return (
    <Pressable
      accessibilityLabel={
        action.accessibilityLabel ?? action.label ?? action.icon?.sf
      }
      accessibilityRole="button"
      onPress={action.onPress}
      style={[s.action, isIconOnly ? s.iconAction : s.labelAction]}
    >
      {action.icon ? (
        <SymbolView
          name={action.icon.sf}
          size={action.iconSize ?? 24}
          tintColor={colors.primary}
        />
      ) : action.label ? (
        <Text style={s.label}>{action.label}</Text>
      ) : null}
    </Pressable>
  );
};

const ActionButton = ({ actions, iconOnly }: ActionButtonProps) => {
  if (!actions.length) return null;

  if (actions.length === 1) {
    const action = actions[0];
    const isIconOnly = Boolean(iconOnly && action.icon && !action.label);

    return (
      <LiquidGlassView
        effect="clear"
        interactive
        style={isIconOnly ? s.iconSurface : s.labelSurface}
        tintColor={colors.canvas}
      >
        <ActionButtonContent action={action} iconOnly={iconOnly} />
        <View pointerEvents="none" style={s.surfaceBorder} />
      </LiquidGlassView>
    );
  }

  return (
    <LiquidGlassView
      effect="clear"
      tintColor={colors.canvas}
      interactive
      style={s.groupSurface}
    >
      <View style={s.groupContent}>
        {actions.map((action, index) => (
          <ActionButtonContent
            key={action.accessibilityLabel ?? action.label ?? index}
            action={action}
            iconOnly={iconOnly}
          />
        ))}
      </View>
      <View pointerEvents="none" style={s.surfaceBorder} />
    </LiquidGlassView>
  );
};

const s = StyleSheet.create({
  action: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconAction: {
    width: 40,
  },
  labelAction: {
    width: 57,
    paddingHorizontal: 16,
  },
  label: {
    color: colors.primary,
  },
  iconSurface: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  labelSurface: {
    height: 40,
    borderRadius: 20,
  },
  groupSurface: {
    height: 40,
    borderRadius: 20,
  },
  surfaceBorder: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
  },
  groupContent: {
    flexDirection: "row",
    paddingHorizontal: 2,
  },
});

export default ActionButton;
