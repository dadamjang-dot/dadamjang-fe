import { renderHook } from "@testing-library/react-native";
import type { SharedValue } from "react-native-reanimated";

import { useHeaderAnimation } from "@/shared/components/product-header/header-animation.ios";
import {
  useCapsuleAnimation,
  useCircularPairAnimation,
} from "@/shared/components/product-layout/layout-animation.ios";

jest.mock("react-native-reanimated", () => {
  const interpolate = (
    value: number,
    input: readonly number[],
    output: readonly number[],
  ) => {
    const segment = value <= (input[0] ?? 0) ? 0 : input.length - 2;
    const inputStart = input[segment] ?? 0;
    const inputEnd = input[segment + 1] ?? inputStart;
    const outputStart = output[segment] ?? 0;
    const outputEnd = output[segment + 1] ?? outputStart;
    const progress = Math.min(
      1,
      Math.max(0, (value - inputStart) / (inputEnd - inputStart || 1)),
    );
    return outputStart + (outputEnd - outputStart) * progress;
  };

  return {
    Extrapolation: { CLAMP: "clamp" },
    interpolate,
    useAnimatedStyle: (factory: () => AnimationStyle) => factory(),
  };
});

type AnimationStyle = {
  [key: string]: unknown;
  transform?: Record<string, number>[];
};

const animatedLayoutProperties = [
  "bottom",
  "flex",
  "flexBasis",
  "flexGrow",
  "flexShrink",
  "height",
  "left",
  "margin",
  "marginBottom",
  "marginHorizontal",
  "marginLeft",
  "marginRight",
  "marginTop",
  "marginVertical",
  "maxHeight",
  "maxWidth",
  "minHeight",
  "minWidth",
  "padding",
  "paddingBottom",
  "paddingHorizontal",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "paddingVertical",
  "right",
  "top",
  "width",
] as const;

const gpuAnimationProperties = new Set([
  "opacity",
  "transform",
  "transformOrigin",
]);

const phases = [0, 0.125, 0.25, 0.5, 1] as const;

const sharedValue = (value: number) =>
  ({ get: () => value, set: jest.fn() }) as unknown as SharedValue<number>;

const expectGpuOnlyStyle = (style: AnimationStyle) => {
  animatedLayoutProperties.forEach((property) =>
    expect(style).not.toHaveProperty(property),
  );
  expect(
    Object.keys(style).filter((property) => !gpuAnimationProperties.has(property)),
  ).toEqual([]);
};

const transformValue = (style: AnimationStyle, property: string) =>
  style.transform?.find((transform) => property in transform)?.[property];

describe("iOS product search animations", () => {
  it.each(phases)(
    "keeps circular action phase %s on GPU-only properties",
    (phase) => {
      const { result } = renderHook(() =>
        useCircularPairAnimation(
          sharedValue(phase),
          sharedValue(88),
          sharedValue(57),
        ),
      );

      [...result.current.groupAnim, result.current.cancelAnim].forEach(
        (style) => expectGpuOnlyStyle(style as AnimationStyle),
      );
    },
  );

  it.each(phases)(
    "keeps capsule phase %s on GPU-only properties",
    (phase) => {
      const { result } = renderHook(() =>
        useCapsuleAnimation(
          sharedValue(phase),
          sharedValue(120),
          sharedValue(60),
        ),
      );
      const capsuleStyle = result.current.groupAnim[0] as AnimationStyle;

      [...result.current.groupAnim, result.current.cancelAnim].forEach(
        (style) => expectGpuOnlyStyle(style as AnimationStyle),
      );
      expect(capsuleStyle.transformOrigin).toBe("right center");
      if (phase === 0.125) {
        expect(capsuleStyle.opacity).toBeCloseTo(0.5);
        expect(transformValue(capsuleStyle, "scaleX")).toBeCloseTo(0.75);
        expect(transformValue(capsuleStyle, "scaleY")).toBeCloseTo(0.925);
      }
    },
  );

  it.each(phases)(
    "keeps search phase %s on GPU-only properties",
    (phase) => {
      const { result } = renderHook(() =>
        useHeaderAnimation(
          sharedValue(phase),
          sharedValue(360),
          sharedValue(96),
          sharedValue(57),
          0.25,
        ),
      );
      const searchStyle = result.current
        .searchInputStyle as unknown as AnimationStyle;

      Object.values(result.current).forEach((style) =>
        expectGpuOnlyStyle(style as unknown as AnimationStyle),
      );
      expect(searchStyle.transformOrigin).toBe("left center");
      if (phase === 1)
        expect(transformValue(searchStyle, "scaleX")).toBeCloseTo(255 / 216);
    },
  );
});
