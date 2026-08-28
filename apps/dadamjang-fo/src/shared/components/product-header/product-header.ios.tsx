import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { View, type LayoutChangeEvent, type TextInput } from "react-native";
import { StyleSheet } from "react-native-unistyles";
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
  const [measuredChildrenWidth, setMeasuredChildrenWidth] = useState(0);

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

  const handleCancel = useCallback(() => {
    inputRef.current?.blur();
    onSearchCancel?.();
  }, [onSearchCancel]);

  const handleContainerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      containerWidth.set(e.nativeEvent.layout.width);
    },
    [containerWidth],
  );

  const handleChildrenLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (childrenWidth.get() === 0 && e.nativeEvent.layout.width > 0) {
        childrenWidth.set(e.nativeEvent.layout.width);
        setMeasuredChildrenWidth(e.nativeEvent.layout.width);
      }
    },
    [childrenWidth],
  );

  const handleCancelLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (cancelWidth.get() === 0 && e.nativeEvent.layout.width > 0) {
        cancelWidth.set(e.nativeEvent.layout.width);
      }
    },
    [cancelWidth],
  );

  useEffect(() => {
    progress.set(
      withTiming(isSearching ? 1 : 0, {
        duration: searchTransitionDuration,
        easing: Easing.linear,
      }),
    );
  }, [isSearching, progress]);

  const { searchInputStyle } = useHeaderAnimation(
    progress,
    containerWidth,
    childrenWidth,
    cancelWidth,
    actionTransitionPhaseEnd,
  );

  return (
    <View style={s.container} onLayout={handleContainerLayout}>
      <Animated.View style={[s.searchInputWrapper, searchInputStyle]}>
        <View style={s.searchInputSurface}>
          <SearchInput
            ref={inputRef}
            value={searchValue}
            placeholder="Search"
            onValueChange={onSearchValueChange}
            onFocus={onSearchFocus}
          />
        </View>
      </Animated.View>
      <View style={s.btnWrapper(measuredChildrenWidth)}>
        <View style={s.measureLayer} onLayout={handleChildrenLayout}>
          {children}
        </View>
        <View style={s.measureLayer} onLayout={handleCancelLayout}>
          <ActionButton actions={[{ label: "취소", onPress: handleCancel }]} />
        </View>
        {children}
      </View>
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
    flex: 1,
    minWidth: 0,
    height: 40,
    alignItems: "flex-start",
  },
  searchInputSurface: {
    width: "100%",
    height: 40,
  },
  btnWrapper: (width: number) => ({
    width: width > 0 ? width : undefined,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
  }),
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
