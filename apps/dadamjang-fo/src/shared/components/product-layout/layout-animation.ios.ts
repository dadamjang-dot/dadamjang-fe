import { useAnimatedStyle, interpolate, Extrapolation } from "react-native-reanimated";
import type { SharedValue, AnimatedStyle } from "react-native-reanimated";
import type { ViewStyle } from "react-native";
import type { ActionButtonGroupAnimation } from "@dadamjang/mobile";

const firstButtonPhaseEnd = 0.25;
const singleButtonWidthPhaseEnd = firstButtonPhaseEnd;
const singleButtonIconPhaseStart = singleButtonWidthPhaseEnd + 0.15;
const singleButtonIconPhaseEnd = singleButtonIconPhaseStart + 0.15;

const emptyStyle = {} as AnimatedStyle<ViewStyle>;

export const useCircularPairAnimation = (
  progress: SharedValue<number>,
  childrenWidth: SharedValue<number>,
  cancelWidth: SharedValue<number>,
) => {
  const firstBtnStyle = useAnimatedStyle(() => {
    const moveDist = childrenWidth.value - cancelWidth.value;
    return {
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0, firstButtonPhaseEnd],
            [0, moveDist > 0 ? moveDist : 0],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            progress.value,
            [0, firstButtonPhaseEnd],
            [1, 0.85],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        progress.value,
        [0, firstButtonPhaseEnd],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      display: progress.value >= firstButtonPhaseEnd ? "none" : "flex",
    };
  });

  const cancelBtnStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [firstButtonPhaseEnd, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [firstButtonPhaseEnd, 1],
          [0.85, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
    display: progress.value <= firstButtonPhaseEnd ? "none" : "flex",
  }));

  const groupAnim: [ActionButtonGroupAnimation, ActionButtonGroupAnimation?] = [firstBtnStyle, emptyStyle];
  return { groupAnim, cancelAnim: cancelBtnStyle };
};

export const useCapsuleAnimation = (
  progress: SharedValue<number>,
  childrenWidth: SharedValue<number>,
  cancelWidth: SharedValue<number>,
) => {
  const containerStyle = useAnimatedStyle(() => {
    if (childrenWidth.value === 0 || cancelWidth.value === 0) {
      return { opacity: 1 };
    }
    return {
      opacity: 1,
      width: interpolate(
        progress.value,
        [0, singleButtonWidthPhaseEnd],
        [childrenWidth.value, cancelWidth.value],
        Extrapolation.CLAMP,
      ),
    };
  });

  const cancelBtnStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [singleButtonIconPhaseEnd, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [singleButtonIconPhaseEnd, 1],
          [0.85, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
    display: progress.value <= singleButtonIconPhaseEnd ? "none" : "flex",
  }));

  const groupAnim: [ActionButtonGroupAnimation, ActionButtonGroupAnimation?] = [containerStyle];
  return { groupAnim, cancelAnim: cancelBtnStyle };
};
