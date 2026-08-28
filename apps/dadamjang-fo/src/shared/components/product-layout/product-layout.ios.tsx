import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  Easing,
  withTiming,
} from "react-native-reanimated";
import { LiquidGlassView } from "@callstack/liquid-glass";

import { ProductHeader, SearchContent } from "@/shared/components";
import {
  ActionButtonGroup,
  ActionButtonContent,
  type ActionButtonGroupAnimation,
} from "@dadamjang/mobile";
import { colors } from "@dadamjang/design-tokens";
import type { ProductLayoutProps } from "./product-layout.types";
import {
  useCircularPairAnimation,
  useCapsuleAnimation,
} from "./layout-animation.ios";

const actionTransitionPhaseEnd = 0.25;
const searchTransitionDuration = 280;

const ProductLayout = (props: ProductLayoutProps) => {
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
      if (childrenWidth.get() === 0 && event.nativeEvent.layout.width > 0) {
        childrenWidth.set(event.nativeEvent.layout.width);
      }
    },
    [childrenWidth],
  );

  const handleCancelLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (cancelWidth.get() === 0 && event.nativeEvent.layout.width > 0) {
        cancelWidth.set(event.nativeEvent.layout.width);
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

  const circularPairAnim = useCircularPairAnimation(
    progress,
    childrenWidth,
    cancelWidth,
  );
  const capsuleAnim = useCapsuleAnimation(progress, childrenWidth, cancelWidth);

  const { groupAnim, cancelAnim } =
    props.variant === "circularPair" ? circularPairAnim : capsuleAnim;

  const renderActionButtonGroup = (
    animations?: readonly [
      ActionButtonGroupAnimation,
      ActionButtonGroupAnimation?,
    ],
  ) =>
    props.variant === "circularPair" ? (
      <ActionButtonGroup
        actions={props.headerActions}
        animations={animations}
        variant="circularPair"
      />
    ) : (
      <ActionButtonGroup
        actions={props.headerActions}
        animations={animations}
        variant="capsule"
      />
    );

  const buttonGroup = (
    <View style={s.buttonRow}>
      {renderActionButtonGroup(groupAnim)}
      <Animated.View style={cancelAnim}>
        <LiquidGlassView
          effect="clear"
          interactive
          style={s.cancelButton}
          tintColor={colors.canvas}
        >
          <ActionButtonContent
            action={{ label: "취소", onPress: handleCancelSearch }}
          />
          <View pointerEvents="none" style={s.surfaceBorder} />
        </LiquidGlassView>
      </Animated.View>
    </View>
  );

  return (
    <View style={s.container}>
      <ProductHeader
        progress={progress}
        actionTransitionPhaseEnd={actionTransitionPhaseEnd}
        isSearching={isSearching}
        onSearchFocus={() => setIsSearching(true)}
        onSearchCancel={handleCancelSearch}
        onSearchValueChange={setSearchValue}
        searchValue={searchValue}
      >
        <View onLayout={handleChildrenLayout} style={s.measureOuter}>
          {renderActionButtonGroup()}
        </View>
        <View onLayout={handleCancelLayout} style={s.measureOuter}>
          <ActionButtonContent action={{ label: "취소", onPress: () => {} }} />
        </View>
        {buttonGroup}
      </ProductHeader>

      {isSearching ? <SearchContent keyword={searchValue} /> : props.children}
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
