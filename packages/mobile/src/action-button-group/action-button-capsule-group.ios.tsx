import { LiquidGlassView } from "@callstack/liquid-glass";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { colors } from "@dadamjang/design-tokens";
import { ActionButtonContent } from "../action-button/action-button.ios";
import type { ActionButtonCapsuleGroupProps } from "./action-button-group.types";

const ActionButtonCapsuleGroup = ({
  actions,
  animations,
}: ActionButtonCapsuleGroupProps) => {
  return (
    <Animated.View style={animations?.[0]}>
      <LiquidGlassView
        effect="clear"
        interactive
        style={s.capsuleGlassButton}
        tintColor={colors.canvas}
      >
        <Animated.View style={[s.capsuleContent, animations?.[1]]}>
          {actions.map((action, index) => (
            <ActionButtonContent
              key={action.accessibilityLabel ?? action.label ?? index}
              action={action}
              iconOnly
            />
          ))}
        </Animated.View>
        <View pointerEvents="none" style={s.surfaceBorder} />
      </LiquidGlassView>
    </Animated.View>
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
