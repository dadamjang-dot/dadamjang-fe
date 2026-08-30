import {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
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
  const searchInputStyle = useAnimatedStyle(() => {
    if (
      containerWidth.get() === 0 ||
      childrenWidth.get() === 0 ||
      cancelWidth.get() === 0
    ) {
      return { opacity: 1 };
    }

    const collapsedSearchWidth = Math.max(
      0,
      containerWidth.get() -
        horizontalPadding * 2 -
        headerGap -
        childrenWidth.get(),
    );
    const expandedSearchWidth = Math.max(
      0,
      containerWidth.get() -
        horizontalPadding * 2 -
        headerGap -
        cancelWidth.get(),
    );
    return {
      transformOrigin: "left center",
      transform: [
        {
          scaleX: interpolate(
            progress.get(),
            [actionTransitionPhaseEnd, 1],
            [1, expandedSearchWidth / Math.max(1, collapsedSearchWidth)],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return { searchInputStyle };
};
