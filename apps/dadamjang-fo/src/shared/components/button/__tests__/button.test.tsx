import { act, type ReactElement } from "react";
import { Text } from "react-native";
import { create, type ReactTestRenderer } from "react-test-renderer";

import { colors } from "@dadamjang/design-tokens";

import { Button } from "../button";

jest.mock("react-native-unistyles", () => ({
  StyleSheet: {
    create: <T,>(styles: T) => styles,
  },
}));

const render = (component: ReactElement) => {
  let renderer: ReactTestRenderer;

  act(() => {
    renderer = create(component);
  });

  return renderer!;
};

const findButton = (renderer: ReactTestRenderer, testID: string) => {
  const button = renderer.root
    .findAllByProps({ testID })
    .find((node) => node.props.accessibilityRole === "button");

  if (!button) throw new Error(`Button ${testID} was not rendered`);

  return button;
};

describe("Button", () => {
  it("renders the label and invokes onPress", () => {
    const onPress = jest.fn();
    const renderer = render(
      <Button label="상품 보기" onPress={onPress} testID="product-view" />,
    );
    const button = findButton(renderer, "product-view");

    expect(renderer.root.findByType(Text).props.children).toBe("상품 보기");

    act(() => {
      button.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not expose an onPress handler when disabled", () => {
    const renderer = render(
      <Button
        disabled
        label="상품 보기"
        onPress={jest.fn()}
        testID="disabled-button"
      />,
    );
    const button = findButton(renderer, "disabled-button");

    expect(button.props.disabled).toBe(true);
    expect(button.props.onPress).toBeUndefined();
  });

  it("renders custom content with its accessibility state", () => {
    const renderer = render(
      <Button
        accessibilityRole="checkbox"
        accessibilityState={{ checked: true }}
        label="필터"
        onPress={jest.fn()}
        testID="filter-toggle"
        variant="bare"
      >
        <Text>필터</Text>
      </Button>,
    );
    const button = renderer.root
      .findAllByProps({ testID: "filter-toggle" })
      .find((node) => node.props.accessibilityRole === "checkbox");

    if (!button) throw new Error("Filter toggle was not rendered");

    expect(button.props.accessibilityState).toEqual({ checked: true });
    expect(renderer.root.findByType(Text).props.children).toBe("필터");
  });

  it("renders a visible dark label for a bare button", () => {
    const renderer = render(
      <Button label="가입하기" onPress={jest.fn()} variant="bare" />,
    );

    expect(renderer.root.findByType(Text).props.style).toContainEqual({
      color: colors.ink,
    });
  });
});
