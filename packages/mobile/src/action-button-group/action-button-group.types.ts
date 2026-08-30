import type { AnimatedStyle } from "react-native-reanimated";
import type { ViewStyle } from "react-native";

import type { IconAction } from "../action-button/action-button.types";

export type ActionButtonGroupVariant = "circularPair" | "capsule";
export type ActionButtonGroupAnimation = AnimatedStyle<ViewStyle>;

interface ActionButtonGroupBaseProps {
  animations?: readonly [
    ActionButtonGroupAnimation,
    ActionButtonGroupAnimation?,
  ];
}

interface ActionButtonCircularPairProps extends ActionButtonGroupBaseProps {
  actions: readonly [IconAction, IconAction];
  variant: "circularPair";
}

interface ActionButtonCapsuleProps extends ActionButtonGroupBaseProps {
  actions: readonly IconAction[];
  variant?: "capsule";
}

export type ActionButtonGroupProps =
  ActionButtonCircularPairProps | ActionButtonCapsuleProps;
export type ActionButtonCircularPairGroupProps = Omit<
  ActionButtonCircularPairProps,
  "variant"
>;
export type ActionButtonCapsuleGroupProps = Omit<
  ActionButtonCapsuleProps,
  "variant"
>;
