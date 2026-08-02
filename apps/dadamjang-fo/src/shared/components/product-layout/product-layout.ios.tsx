import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, type LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  withSpring,
  Extrapolation,
} from "react-native-reanimated";

import { ActionButton, ProductHeader, SearchContent } from "@/shared/components";
import { colors } from "@dadamjang/design-tokens";
import type { ProductLayoutProps } from "./product-layout.types";

const ProductLayout = ({ headerActions, children }: ProductLayoutProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleCancelSearch = useCallback(() => {
    setIsSearching(false);
    setSearchValue("");
  }, []);

  const progress = useSharedValue(0);
  const childrenWidth = useSharedValue(0);
  const cancelWidth = useSharedValue(0);

  const isTwoBtnCase = headerActions.length === 2;

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

  const singleBtnContainerStyle = useAnimatedStyle(() => ({
    width: interpolate(
      progress.value,
      [0, 1],
      [childrenWidth.value, cancelWidth.value],
      Extrapolation.CLAMP
    ),
  }));

  const singleIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 0.45], [1, 0.85], Extrapolation.CLAMP),
      },
    ],
    display: progress.value === 1 ? "none" : "flex",
  }));

  const singleCancelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.35, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0.35, 1], [0.85, 1], Extrapolation.CLAMP),
      },
    ],
    display: progress.value === 0 ? "none" : "flex",
  }));

  const firstBtnStyle = useAnimatedStyle(() => {
    const moveDist = childrenWidth.value - cancelWidth.value;
    return {
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0, 1],
            [0, moveDist > 0 ? moveDist : 0],
            Extrapolation.CLAMP
          ),
        },
        {
          scale: interpolate(progress.value, [0, 0.65], [1, 0.85], Extrapolation.CLAMP),
        },
      ],
      opacity: interpolate(progress.value, [0, 0.65], [1, 0], Extrapolation.CLAMP),
      display: progress.value === 1 ? "none" : "flex",
    };
  });

  const secondBtnStyle = useAnimatedStyle(() => ({
    width: interpolate(
      progress.value,
      [0, 1],
      [40, cancelWidth.value],
      Extrapolation.CLAMP
    ),
  }));

  const secondBtnIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 0.45], [1, 0.85], Extrapolation.CLAMP),
      },
    ],
    display: progress.value === 1 ? "none" : "flex",
  }));

  const secondBtnCancelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.35, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0.35, 1], [0.85, 1], Extrapolation.CLAMP),
      },
    ],
    display: progress.value === 0 ? "none" : "flex",
  }));

  const buttonGroup = isTwoBtnCase ? (
    <View style={actionStyles.twoBtnRow}>
      <Animated.View style={firstBtnStyle}>
        <ActionButton actions={headerActions[0]} iconOnly />
      </Animated.View>
      <Animated.View style={[actionStyles.expandingBtn, secondBtnStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, actionStyles.centerContent, secondBtnIconStyle]}>
          <ActionButton actions={headerActions[1]} iconOnly />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, actionStyles.rightContent, secondBtnCancelStyle]}>
          <ActionButton actions={[{ label: "취소", onPress: handleCancelSearch }]} />
        </Animated.View>
      </Animated.View>
    </View>
  ) : (
    <Animated.View style={[actionStyles.expandingBtn, singleBtnContainerStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, actionStyles.rightContent, singleIconStyle]}>
        <ActionButton actions={headerActions[0]} iconOnly />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, actionStyles.rightContent, singleCancelStyle]}>
        <ActionButton actions={[{ label: "취소", onPress: handleCancelSearch }]} />
      </Animated.View>
    </Animated.View>
  );

  return (
    <View style={s.container}>
      <ProductHeader
        isSearching={isSearching}
        onSearchFocus={() => setIsSearching(true)}
        onSearchCancel={handleCancelSearch}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
      >
        <View style={actionStyles.measureOuter} onLayout={handleChildrenLayout}>
          {headerActions.map((actions, i) => (
            <ActionButton key={i} actions={actions} iconOnly />
          ))}
        </View>
        <View style={actionStyles.measureOuter} onLayout={handleCancelLayout}>
          <ActionButton actions={[{ label: "취소", onPress: () => {} }]} />
        </View>
        {buttonGroup}
      </ProductHeader>

      {isSearching ? <SearchContent keyword={searchValue} /> : children}
    </View>
  );
};

const actionStyles = StyleSheet.create({
  measureOuter: {
    position: "absolute",
    top: -9999,
    left: -9999,
    opacity: 0,
    pointerEvents: "none",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  twoBtnRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  expandingBtn: {
    height: 40,
    borderRadius: 20,
    position: "relative",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  rightContent: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
});

export default ProductLayout;
