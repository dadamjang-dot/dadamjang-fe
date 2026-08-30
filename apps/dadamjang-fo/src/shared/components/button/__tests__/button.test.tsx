import { render, screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";

import { colors } from "@dadamjang/design-tokens";

import { Button } from "../button";

describe("Button", () => {
  it("renders the label and invokes onPress", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    render(
      <Button label="상품 보기" onPress={onPress} testID="product-view" />,
    );

    const button = screen.getByRole("button", { name: "상품 보기" });
    expect(button).toBeVisible();
    await user.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not invoke onPress when disabled", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    render(
      <Button
        disabled
        label="상품 보기"
        onPress={onPress}
        testID="disabled-button"
      />,
    );

    const button = screen.getByRole("button", { name: "상품 보기" });
    expect(button).toBeDisabled();
    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it("renders custom content with its accessibility state", () => {
    render(
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

    expect(screen.getByRole("checkbox", { name: "필터" })).toBeChecked();
    expect(screen.getByText("필터")).toBeVisible();
  });

  it("renders a visible dark label for a bare button", () => {
    render(<Button label="가입하기" onPress={jest.fn()} variant="bare" />);

    expect(screen.getByText("가입하기")).toHaveStyle({ color: colors.ink });
  });
});
