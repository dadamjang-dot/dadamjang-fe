import { useDerivedValue, useAnimatedStyle, interpolate, Extrapolation } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

const horizontalPadding = 16;
const headerGap = 16;

export const useHeaderAnimation = (
  progress: SharedValue<number>,
  containerWidth: SharedValue<number>,
  childrenWidth: SharedValue<number>,
  cancelWidth: SharedValue<number>,
  actionTransitionPhaseEnd: number,
) => {
  const btnWrapperWidth = useDerivedValue(() => {
    return interpolate(
      progress.value,
      [actionTransitionPhaseEnd, 1],
      [childrenWidth.value, cancelWidth.value],
      Extrapolation.CLAMP,
    );
  });

  const btnWrapperStyle = useAnimatedStyle(() => {
    if (childrenWidth.value === 0 || cancelWidth.value === 0) {
      return { opacity: 1 };
    }

    return {
      opacity: 1,
      width: btnWrapperWidth.value,
    };
  });

  const searchInputStyle = useAnimatedStyle(() => {
    if (
      containerWidth.value === 0 ||
      childrenWidth.value === 0 ||
      cancelWidth.value === 0
    ) {
      return { flex: 1 };
    }

    return {
      flex: 0,
      width: Math.max(
        0,
        containerWidth.value -
          horizontalPadding * 2 -
          headerGap -
          btnWrapperWidth.value,
      ),
    };
  });

  return { btnWrapperStyle, searchInputStyle };
};
