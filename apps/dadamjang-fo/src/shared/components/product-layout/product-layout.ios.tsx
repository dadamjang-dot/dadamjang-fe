import {
  LiquidGlassContainerView,
  LiquidGlassView,
} from "@callstack/liquid-glass";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Easing,
  withTiming,
  Extrapolation,
} from "react-native-reanimated";

import {
  ActionButton,
  ProductHeader,
  SearchContent,
} from "@/shared/components";
import { ActionButtonContent } from "@/shared/components/action-button/action-button.ios";
import { colors } from "@dadamjang/design-tokens";
import type { ProductLayoutProps } from "./product-layout.types";

const firstButtonPhaseEnd = 0.25;
const singleButtonWidthPhaseEnd = firstButtonPhaseEnd;
const singleButtonIconPhaseStart = singleButtonWidthPhaseEnd + 0.15;
const singleButtonIconPhaseEnd = singleButtonIconPhaseStart + 0.15;
const searchTransitionDuration = 280;
const AnimatedLiquidGlassView =
  Animated.createAnimatedComponent(LiquidGlassView);

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
    (event: LayoutChangeEvent) => {
      childrenWidth.value = event.nativeEvent.layout.width;
    },
    [childrenWidth],
  );

  const handleCancelLayout = useCallback(
    (event: LayoutChangeEvent) => {
      cancelWidth.value = event.nativeEvent.layout.width;
    },
    [cancelWidth],
  );

  useEffect(() => {
    progress.value = withTiming(isSearching ? 1 : 0, {
      duration: searchTransitionDuration,
      easing: Easing.linear,
    });
  }, [isSearching, progress]);

  const singleBtnContainerStyle = useAnimatedStyle(() => {
    if (childrenWidth.value === 0 || cancelWidth.value === 0) {
      return { opacity: 1 };
    }

    return {
      opacity: 1,
      width: interpolate(
        progress.value,
        [0, singleButtonWidthPhaseEnd],
        [childrenWidth.value, cancelWidth.value],
        Extrapolation.CLAMP,
      ),
    };
  });

  const singleIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [singleButtonIconPhaseStart, singleButtonIconPhaseEnd],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [
            0,
            singleButtonWidthPhaseEnd,
            singleButtonIconPhaseStart,
            singleButtonIconPhaseEnd,
          ],
          [1, 0.9, 0.9, 0.85],
          Extrapolation.CLAMP,
        ),
      },
    ],
    display: progress.value >= singleButtonIconPhaseEnd ? "none" : "flex",
  }));

  const singleCancelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [singleButtonIconPhaseEnd, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [singleButtonIconPhaseEnd, 1],
          [0.85, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
    display: progress.value <= singleButtonIconPhaseEnd ? "none" : "flex",
  }));

  const firstBtnStyle = useAnimatedStyle(() => {
    const moveDist = childrenWidth.value - cancelWidth.value;

    return {
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0, firstButtonPhaseEnd],
            [0, moveDist > 0 ? moveDist : 0],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            progress.value,
            [0, firstButtonPhaseEnd],
            [1, 0.85],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        progress.value,
        [0, firstButtonPhaseEnd],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      display: progress.value >= firstButtonPhaseEnd ? "none" : "flex",
    };
  });

  const secondBtnStyle = useAnimatedStyle(() => ({
    width: progress.value < firstButtonPhaseEnd ? 40 : cancelWidth.value,
  }));

  const secondBtnIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [firstButtonPhaseEnd, firstButtonPhaseEnd + 0.2],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [firstButtonPhaseEnd, firstButtonPhaseEnd + 0.2],
          [1, 0.85],
          Extrapolation.CLAMP,
        ),
      },
    ],
    display: progress.value === 1 ? "none" : "flex",
  }));

  const secondBtnCancelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [firstButtonPhaseEnd + 0.2, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [firstButtonPhaseEnd + 0.2, 1],
          [0.85, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
    display: progress.value <= firstButtonPhaseEnd ? "none" : "flex",
  }));

  const buttonGroup = isTwoBtnCase ? (
    <LiquidGlassContainerView spacing={0} style={actionStyles.twoBtnRow}>
      <AnimatedLiquidGlassView
        effect="clear"
        interactive
        style={[actionStyles.iconGlassButton, firstBtnStyle]}
        tintColor={colors.canvas}
      >
        <ActionButtonContent action={headerActions[0][0]} iconOnly />
        <View pointerEvents="none" style={actionStyles.surfaceBorder} />
      </AnimatedLiquidGlassView>
      <AnimatedLiquidGlassView
        effect="clear"
        interactive
        style={[actionStyles.expandingGlassButton, secondBtnStyle]}
        tintColor={colors.canvas}
      >
        <Animated.View
          style={[
            actionStyles.absoluteFill,
            actionStyles.centerContent,
            secondBtnIconStyle,
          ]}
        >
          <ActionButtonContent action={headerActions[1][0]} iconOnly />
        </Animated.View>
        <Animated.View
          style={[
            actionStyles.absoluteFill,
            actionStyles.rightContent,
            secondBtnCancelStyle,
          ]}
        >
          <ActionButtonContent
            action={{ label: "취소", onPress: handleCancelSearch }}
          />
        </Animated.View>
        <View pointerEvents="none" style={actionStyles.surfaceBorder} />
      </AnimatedLiquidGlassView>
    </LiquidGlassContainerView>
  ) : (
    <AnimatedLiquidGlassView
      effect="clear"
      interactive
      style={[actionStyles.expandingGlassButton, singleBtnContainerStyle]}
    >
      <Animated.View
        style={[
          actionStyles.absoluteFill,
          actionStyles.centerContent,
          singleIconStyle,
        ]}
      >
        <View style={actionStyles.singleButtonContent}>
          {headerActions[0].map((action, index) => (
            <ActionButtonContent
              key={action.label ?? action.icon ?? index}
              action={action}
              iconOnly
            />
          ))}
        </View>
      </Animated.View>
      <Animated.View
        style={[
          actionStyles.absoluteFill,
          actionStyles.rightContent,
          singleCancelStyle,
        ]}
      >
        <ActionButtonContent
          action={{ label: "취소", onPress: handleCancelSearch }}
        />
      </Animated.View>
      <View pointerEvents="none" style={actionStyles.surfaceBorder} />
    </AnimatedLiquidGlassView>
  );

  return (
    <View style={s.container}>
      <ProductHeader
        actionTransitionPhaseEnd={
          isTwoBtnCase ? firstButtonPhaseEnd : singleButtonWidthPhaseEnd
        }
        isSearching={isSearching}
        onSearchFocus={() => setIsSearching(true)}
        onSearchCancel={handleCancelSearch}
        onSearchValueChange={setSearchValue}
        searchValue={searchValue}
      >
        <View onLayout={handleChildrenLayout} style={actionStyles.measureOuter}>
          {headerActions.map((actions, index) => (
            <ActionButton key={index} actions={actions} iconOnly />
          ))}
        </View>
        <View onLayout={handleCancelLayout} style={actionStyles.measureOuter}>
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
    height: 40,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  iconGlassButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    flexShrink: 0,
  },
  expandingGlassButton: {
    height: 40,
    borderRadius: 20,
    position: "relative",
    flexShrink: 0,
  },
  absoluteFill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  surfaceBorder: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  rightContent: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  singleButtonContent: {
    flexDirection: "row",
  },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
});

export default ProductLayout;
