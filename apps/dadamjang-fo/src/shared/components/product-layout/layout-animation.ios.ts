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
    const moveDist = childrenWidth.get() - cancelWidth.get();
    return {
      transform: [
        {
          translateX: interpolate(
            progress.get(),
            [0, phaseEnd],
            [0, moveDist > 0 ? moveDist : 0],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            progress.get(),
            [0, phaseEnd],
            [1, 0.85],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(progress.get(), [0, phaseEnd], [1, 0], Extrapolation.CLAMP),
      display: progress.get() >= phaseEnd ? "none" : "flex",
    };
  });

  const secondBtnStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          progress.get(),
          [0, phaseEnd],
          [1, 0.85],
          Extrapolation.CLAMP,
        ),
      },
    ],
    opacity: interpolate(progress.get(), [0, phaseEnd], [1, 0], Extrapolation.CLAMP),
    display: progress.get() >= phaseEnd ? "none" : "flex",
  }));

  const cancelBtnStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [phaseEnd, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(
          progress.get(),
          [phaseEnd, 1],
          [0.85, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
    display: progress.get() <= phaseEnd ? "none" : "flex",
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
    if (childrenWidth.get() === 0 || cancelWidth.get() === 0) {
      return {
        opacity: interpolate(progress.get(), [0, phaseEnd], [1, 0], Extrapolation.CLAMP),
        display: progress.get() >= phaseEnd ? "none" : "flex",
      };
    }

    return {
      width: interpolate(
        progress.get(),
        [0, phaseEnd],
        [childrenWidth.get(), cancelWidth.get()],
        Extrapolation.CLAMP,
      ),
      opacity: interpolate(progress.get(), [0, phaseEnd], [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(
            progress.get(),
            [0, phaseEnd],
            [1, 0.85],
            Extrapolation.CLAMP,
          ),
        },
      ],
      display: progress.get() >= phaseEnd ? "none" : "flex",
    };
  });

  const iconStyle = useAnimatedStyle(() => ({
    opacity: progress.get() > 0 ? 0 : 1,
  }));

  const cancelBtnStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [phaseEnd, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(
          progress.get(),
          [phaseEnd, 1],
          [0.85, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
    display: progress.get() <= phaseEnd ? "none" : "flex",
  }));

  const groupAnim: [ActionButtonGroupAnimation, ActionButtonGroupAnimation?] = [
    capsuleStyle,
    iconStyle,
  ];

  return { groupAnim, cancelAnim: cancelBtnStyle };
};
