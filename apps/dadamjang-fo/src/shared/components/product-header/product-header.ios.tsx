import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View, type LayoutChangeEvent, type TextInput } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  withSpring,
  Extrapolation,
} from "react-native-reanimated";

import { ActionButton, SearchInput } from "@/shared/components";
import { colors } from "@dadamjang/design-tokens";

export interface ProductHeaderProps {
  children?: ReactNode;
  isSearching?: boolean;
  onSearchFocus?: () => void;
  onSearchCancel?: () => void;
  searchValue?: string;
  onSearchValueChange?: (text: string) => void;
}

const ProductHeader = ({
  children,
  isSearching = false,
  onSearchFocus,
  onSearchCancel,
  searchValue,
  onSearchValueChange,
}: ProductHeaderProps) => {
  const inputRef = useRef<TextInput>(null);

  const containerWidth = useSharedValue(0);
  const childrenWidth = useSharedValue(0);
  const cancelWidth = useSharedValue(0);

  const progress = useSharedValue(0);

  useEffect(() => {
    if (!isSearching) {
      inputRef.current?.blur();
    }
  }, [isSearching]);

  const handleContainerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      containerWidth.value = e.nativeEvent.layout.width;
    },
    [containerWidth]
  );

  const handleChildrenLayout = useCallback(
    (e: LayoutChangeEvent) => {
      childrenWidth.value = e.nativeEvent.layout.width;
    },
    [childrenWidth]
  );

  const handleCancelLayout = useCallback(
    (e: LayoutChangeEvent) => {
      cancelWidth.value = e.nativeEvent.layout.width;
    },
    [cancelWidth]
  );

  useEffect(() => {
    progress.value = withSpring(isSearching ? 1 : 0, {
      mass: 0.9,
      damping: 25,
      stiffness: 260,
    });
  }, [isSearching, progress]);

  const btnWrapperWidth = useDerivedValue(() => {
    return interpolate(
      progress.value,
      [0, 1],
      [childrenWidth.value, cancelWidth.value],
      Extrapolation.CLAMP
    );
  });

  const searchInputStyle = useAnimatedStyle(() => {
    const calcWidth = containerWidth.value - 32 - 16 - btnWrapperWidth.value;
    return {
      width: calcWidth > 0 ? calcWidth : "100%",
    };
  });

  const btnWrapperStyle = useAnimatedStyle(() => ({
    width: btnWrapperWidth.value,
  }));

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
    backgroundColor: colors.primarySoft,
  },
  searchInputWrapper: {
    height: 40,
  },
  btnWrapper: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  measureLayer: {
    position: "absolute",
    top: -9999,
    left: -9999,
    opacity: 0,
    pointerEvents: "none",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
});

export default ProductHeader;
