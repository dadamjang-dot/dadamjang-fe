import { useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type TextInput,
} from "react-native";
import Animated, {
  useSharedValue,
  Easing,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { ActionButton, SearchInput } from "@/shared/components";
import { colors } from "@dadamjang/design-tokens";
import { useHeaderAnimation } from "./header-animation.ios";

const searchTransitionDuration = 280;

export interface ProductHeaderProps {
  children?: ReactNode;
  isSearching?: boolean;
  onSearchFocus?: () => void;
  onSearchCancel?: () => void;
  searchValue?: string;
  onSearchValueChange?: (text: string) => void;
  actionTransitionPhaseEnd?: number;
  progress?: SharedValue<number>;
}

const ProductHeader = ({
  children,
  isSearching = false,
  onSearchFocus,
  onSearchCancel,
  searchValue,
  onSearchValueChange,
  actionTransitionPhaseEnd = 0,
  progress: customProgress,
}: ProductHeaderProps) => {
  const inputRef = useRef<TextInput>(null);

  const containerWidth = useSharedValue(0);
  const childrenWidth = useSharedValue(0);
  const cancelWidth = useSharedValue(0);

  const internalProgress = useSharedValue(0);
  const progress = customProgress ?? internalProgress;

  useEffect(() => {
    if (!isSearching) {
      inputRef.current?.blur();
    }
  }, [isSearching]);

  const handleContainerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      containerWidth.value = e.nativeEvent.layout.width;
    },
    [containerWidth],
  );

  const handleChildrenLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (childrenWidth.value === 0 && e.nativeEvent.layout.width > 0) {
        childrenWidth.value = e.nativeEvent.layout.width;
      }
    },
    [childrenWidth],
  );

  const handleCancelLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (cancelWidth.value === 0 && e.nativeEvent.layout.width > 0) {
        cancelWidth.value = e.nativeEvent.layout.width;
      }
    },
    [cancelWidth],
  );

  useEffect(() => {
    progress.value = withTiming(isSearching ? 1 : 0, {
      duration: searchTransitionDuration,
      easing: Easing.linear,
    });
  }, [isSearching, progress]);

  const { btnWrapperStyle, searchInputStyle } = useHeaderAnimation(
    progress,
    containerWidth,
    childrenWidth,
    cancelWidth,
    actionTransitionPhaseEnd,
  );

  return (
    <View style={s.container} onLayout={handleContainerLayout}>
      <Animated.View style={[s.searchInputWrapper, searchInputStyle]}>
        <SearchInput
          ref={inputRef}
          value={searchValue}
          placeholder="Search"
          onValueChange={onSearchValueChange}
          onFocus={onSearchFocus}
        />
      </Animated.View>
      <Animated.View style={[s.btnWrapper, btnWrapperStyle]}>
        <View style={s.measureLayer} onLayout={handleChildrenLayout}>
          {children}
        </View>
        <View style={s.measureLayer} onLayout={handleCancelLayout}>
          <ActionButton actions={[{ label: "취소", onPress: () => {} }]} />
        </View>
        {children}
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    overflow: "visible",
    zIndex: 1,
  },
  searchInputWrapper: {
    minWidth: 0,
    height: 40,
  },
  btnWrapper: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
  },
  measureLayer: {
    position: "absolute",
    top: -9999,
    left: -9999,
    opacity: 0,
    pointerEvents: "none",
    flexDirection: "row",
    alignItems: "center",
  },
});

export default ProductHeader;
