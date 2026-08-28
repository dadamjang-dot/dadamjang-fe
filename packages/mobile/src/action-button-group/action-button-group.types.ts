import type { AnimatedStyle } from "react-native-reanimated";
import type { ViewStyle } from "react-native";

import type { IconAction } from "../action-button/action-button.types";

export type ActionButtonGroupVariant = "circularPair" | "capsule";
export type ActionButtonGroupAnimation = AnimatedStyle<ViewStyle>;

export interface ActionButtonGroupProps {
  actions: IconAction[];
  variant?: ActionButtonGroupVariant;
  animations?: [ActionButtonGroupAnimation, ActionButtonGroupAnimation?];
}

export type ActionButtonCircularPairGroupProps = Omit<ActionButtonGroupProps, "variant">;
export type ActionButtonCapsuleGroupProps = Omit<ActionButtonGroupProps, "variant">;
