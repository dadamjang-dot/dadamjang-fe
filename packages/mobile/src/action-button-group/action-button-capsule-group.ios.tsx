import { LiquidGlassView } from "@callstack/liquid-glass";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { colors } from "@dadamjang/design-tokens";
import { ActionButtonContent } from "../action-button/action-button.ios";
import type { ActionButtonCapsuleGroupProps } from "./action-button-group.types";

const AnimatedLiquidGlassView =
  Animated.createAnimatedComponent(LiquidGlassView);

const ActionButtonCapsuleGroup = ({
  actions,
  animations,
}: ActionButtonCapsuleGroupProps) => {
  return (
    <AnimatedLiquidGlassView
      effect="clear"
      interactive
      style={[s.capsuleGlassButton, animations?.[0]]}
      tintColor={colors.canvas}
    >
      <View style={s.capsuleContent}>
        {actions.map((action, index) => (
          <ActionButtonContent
            key={action.label ?? action.icon ?? index}
            action={action}
            iconOnly
          />
        ))}
      </View>
      <View pointerEvents="none" style={s.surfaceBorder} />
    </AnimatedLiquidGlassView>
  );
};

const s = StyleSheet.create({
  capsuleGlassButton: {
    height: 40,
    borderRadius: 20,
    position: "relative",
    flexShrink: 0,
  },
  capsuleContent: {
    flexDirection: "row",
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
});

export default ActionButtonCapsuleGroup;
