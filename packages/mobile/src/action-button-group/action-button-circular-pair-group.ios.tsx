import { LiquidGlassContainerView, LiquidGlassView } from "@callstack/liquid-glass";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { colors } from "@dadamjang/design-tokens";
import { ActionButtonContent } from "../action-button/action-button.ios";
import type { ActionButtonCircularPairGroupProps } from "./action-button-group.types";

const AnimatedLiquidGlassView =
  Animated.createAnimatedComponent(LiquidGlassView);

const ActionButtonCircularPairGroup = ({
  actions,
  animations,
}: ActionButtonCircularPairGroupProps) => {
  return (
    <LiquidGlassContainerView style={s.row}>
      <AnimatedLiquidGlassView
        effect="clear"
        interactive
        style={[s.iconGlassButton, animations?.[0]]}
        tintColor={colors.canvas}
      >
        <ActionButtonContent action={actions[0]} iconOnly />
        <View pointerEvents="none" style={s.surfaceBorder} />
      </AnimatedLiquidGlassView>

      <AnimatedLiquidGlassView
        effect="clear"
        interactive
        style={[s.iconGlassButton, animations?.[1]]}
        tintColor={colors.canvas}
      >
        <ActionButtonContent action={actions[1]} iconOnly />
        <View pointerEvents="none" style={s.surfaceBorder} />
      </AnimatedLiquidGlassView>
    </LiquidGlassContainerView>
  );
};

const s = StyleSheet.create({
  row: {
    height: 40,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  iconGlassButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    flexShrink: 0,
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

export default ActionButtonCircularPairGroup;
