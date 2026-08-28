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
      progress.get(),
      [actionTransitionPhaseEnd, 1],
      [childrenWidth.get(), cancelWidth.get()],
      Extrapolation.CLAMP,
    );
  });

  const btnWrapperStyle = useAnimatedStyle(() => {
    if (childrenWidth.get() === 0 || cancelWidth.get() === 0) {
      return { opacity: 1 };
    }

    return {
      opacity: 1,
      width: btnWrapperWidth.get(),
    };
  });

  const searchInputStyle = useAnimatedStyle(() => {
    if (
      containerWidth.get() === 0 ||
      childrenWidth.get() === 0 ||
      cancelWidth.get() === 0
    ) {
      return { flex: 1 };
    }

    return {
      flex: 0,
      width: Math.max(
        0,
        containerWidth.get() -
          horizontalPadding * 2 -
          headerGap -
          btnWrapperWidth.get(),
      ),
    };
  });

  return { btnWrapperStyle, searchInputStyle };
};
