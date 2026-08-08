import { useAnimatedStyle, interpolate, Extrapolation } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import type { ActionButtonGroupAnimation } from "@dadamjang/mobile";

const phaseEnd = 0.25;

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
            [0, phaseEnd],
            [0, moveDist > 0 ? moveDist : 0],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            progress.value,
            [0, phaseEnd],
            [1, 0.85],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(progress.value, [0, phaseEnd], [1, 0], Extrapolation.CLAMP),
      display: progress.value >= phaseEnd ? "none" : "flex",
    };
  });

  const secondBtnStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, phaseEnd],
          [1, 0.85],
          Extrapolation.CLAMP,
        ),
      },
    ],
    opacity: interpolate(progress.value, [0, phaseEnd], [1, 0], Extrapolation.CLAMP),
    display: progress.value >= phaseEnd ? "none" : "flex",
  }));

  const cancelBtnStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [phaseEnd, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [phaseEnd, 1],
          [0.85, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
    display: progress.value <= phaseEnd ? "none" : "flex",
  }));

  const groupAnim: [ActionButtonGroupAnimation, ActionButtonGroupAnimation?] = [
    firstBtnStyle,
    secondBtnStyle,
  ];

  return { groupAnim, cancelAnim: cancelBtnStyle };
};

export const useCapsuleAnimation = (
  progress: SharedValue<number>,
  childrenWidth: SharedValue<number>,
  cancelWidth: SharedValue<number>,
) => {
  const capsuleStyle = useAnimatedStyle(() => {
    if (childrenWidth.value === 0 || cancelWidth.value === 0) {
      return {
        opacity: interpolate(progress.value, [0, phaseEnd], [1, 0], Extrapolation.CLAMP),
        display: progress.value >= phaseEnd ? "none" : "flex",
      };
    }

    return {
      width: interpolate(
        progress.value,
        [0, phaseEnd],
        [childrenWidth.value, cancelWidth.value],
        Extrapolation.CLAMP,
      ),
      opacity: interpolate(progress.value, [0, phaseEnd], [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(
            progress.value,
            [0, phaseEnd],
            [1, 0.85],
            Extrapolation.CLAMP,
          ),
        },
      ],
      display: progress.value >= phaseEnd ? "none" : "flex",
    };
  });

  const cancelBtnStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [phaseEnd, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [phaseEnd, 1],
          [0.85, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
    display: progress.value <= phaseEnd ? "none" : "flex",
  }));

  const groupAnim: [ActionButtonGroupAnimation, ActionButtonGroupAnimation?] = [
    capsuleStyle,
  ];

  return { groupAnim, cancelAnim: cancelBtnStyle };
};
