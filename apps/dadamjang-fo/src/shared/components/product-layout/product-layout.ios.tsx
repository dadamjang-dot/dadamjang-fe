import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  Easing,
  withTiming,
} from "react-native-reanimated";
import { LiquidGlassView } from "@callstack/liquid-glass";

import { ProductHeader, SearchContent } from "@/shared/components";
import { ActionButtonGroup, ActionButtonContent } from "@dadamjang/mobile";
import { colors } from "@dadamjang/design-tokens";
import type { ProductLayoutProps } from "./product-layout.types";
import {
  useCircularPairAnimation,
  useCapsuleAnimation,
} from "./layout-animation.ios";

const AnimatedLiquidGlassView =
  Animated.createAnimatedComponent(LiquidGlassView);

const actionTransitionPhaseEnd = 0.25;
const searchTransitionDuration = 280;

const ProductLayout = ({
  headerActions,
  variant,
  children,
}: ProductLayoutProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleCancelSearch = useCallback(() => {
    setIsSearching(false);
    setSearchValue("");
  }, []);

  const progress = useSharedValue(0);
  const childrenWidth = useSharedValue(0);
  const cancelWidth = useSharedValue(0);

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

  const circularPairAnimation = useCircularPairAnimation(
    progress,
    childrenWidth,
    cancelWidth,
  );
  const capsuleAnimation = useCapsuleAnimation(
    progress,
    childrenWidth,
    cancelWidth,
  );

  const { groupAnim, cancelAnim } =
    variant === "circularPair" ? circularPairAnimation : capsuleAnimation;

  const buttonGroup = (
    <View style={s.buttonRow}>
      <ActionButtonGroup
        actions={headerActions}
        variant={variant}
        animations={groupAnim}
      />
      <AnimatedLiquidGlassView
        effect="clear"
        interactive
        style={[s.cancelButton, cancelAnim]}
        tintColor={colors.canvas}
      >
        <ActionButtonContent
          action={{ label: "취소", onPress: handleCancelSearch }}
        />
        <View pointerEvents="none" style={s.surfaceBorder} />
      </AnimatedLiquidGlassView>
    </View>
  );

  return (
    <View style={s.container}>
      <ProductHeader
        actionTransitionPhaseEnd={actionTransitionPhaseEnd}
        isSearching={isSearching}
        onSearchFocus={() => setIsSearching(true)}
        onSearchCancel={handleCancelSearch}
        onSearchValueChange={setSearchValue}
        searchValue={searchValue}
      >
        <View onLayout={handleChildrenLayout} style={s.measureOuter}>
          {headerActions.map((actions, index) => (
            <ActionButtonContent key={index} action={actions} iconOnly />
          ))}
        </View>
        <View onLayout={handleCancelLayout} style={s.measureOuter}>
          <ActionButtonContent action={{ label: "취소", onPress: () => {} }} />
        </View>
        {buttonGroup}
      </ProductHeader>

      {isSearching ? <SearchContent keyword={searchValue} /> : children}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  buttonRow: {
    height: 40,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
  },
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
  cancelButton: {
    height: 40,
    borderRadius: 20,
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
});

export default ProductLayout;
