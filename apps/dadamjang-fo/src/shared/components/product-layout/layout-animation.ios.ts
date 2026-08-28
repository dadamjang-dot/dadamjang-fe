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
      };
    }

    const collapsedScale = cancelWidth.get() / childrenWidth.get();
    return {
      opacity: interpolate(progress.get(), [0, phaseEnd], [1, 0], Extrapolation.CLAMP),
      transformOrigin: "right center",
      transform: [
        {
          scaleX: interpolate(
            progress.get(),
            [0, phaseEnd],
            [1, collapsedScale],
            Extrapolation.CLAMP,
          ),
        },
        {
          scaleY: interpolate(
            progress.get(),
            [0, phaseEnd],
            [1, 0.85],
            Extrapolation.CLAMP,
          ),
        },
      ],
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
  }));

  const groupAnim: [ActionButtonGroupAnimation, ActionButtonGroupAnimation?] = [
    capsuleStyle,
    iconStyle,
  ];

  return { groupAnim, cancelAnim: cancelBtnStyle };
};
