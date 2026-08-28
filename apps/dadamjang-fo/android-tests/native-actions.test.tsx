import {
  renderAsync,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { View } from "react-native";

import {
  ActionButton,
  type IconAction,
} from "@dadamjang/mobile";
import TabLayout from "../src/app/(tabs)/_layout";
import { ProductLayout } from "../src/shared/components/product-layout";

jest.useFakeTimers();

const materialIconSource = 1;

const notificationAction = (onPress: () => void): IconAction => ({
  accessibilityLabel: "알림",
  icon: { md: "notifications", sf: "bell" },
  onPress,
});

const cartAction = (onPress: () => void): IconAction => ({
  accessibilityLabel: "장바구니",
  icon: { md: "shopping_cart", sf: "cart" },
  onPress,
});

const createUser = () =>
  userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe("Android native actions", () => {
  it("passes synchronous accessible icon props and invokes each action", async () => {
    const onNotificationPress = jest.fn();
    const onCartPress = jest.fn();
    const user = createUser();

    await renderAsync(
      <ActionButton
        actions={[
          notificationAction(onNotificationPress),
          cartAction(onCartPress),
        ]}
      />,
    );

    const buttons = await screen.findAllByRole("button");

    expect(buttons).toHaveLength(2);

    const notificationImage = screen.getByRole("img", { name: "알림" });
    const cartImage = screen.getByRole("img", { name: "장바구니" });

    expect(notificationImage).toHaveProp("source", materialIconSource);
    expect(cartImage).toHaveProp("source", materialIconSource);
    expect(cartImage).toHaveStyle({ height: 20, width: 20 });

    await user.press(buttons[0]);
    await user.press(buttons[1]);

    expect(onNotificationPress).toHaveBeenCalledTimes(1);
    expect(onCartPress).toHaveBeenCalledTimes(1);
  });

  it("renders header actions once using the requested circular pair", async () => {
    const onNotificationPress = jest.fn();
    const onCartPress = jest.fn();
    const user = createUser();

    await renderAsync(
      <ProductLayout
        headerActions={[
          notificationAction(onNotificationPress),
          cartAction(onCartPress),
        ]}
        variant="circularPair"
      >
        <View />
      </ProductLayout>,
    );

    const buttons = await screen.findAllByRole("button");

    expect(buttons).toHaveLength(2);

    const notificationButton = buttons[0];
    const cartButton = buttons[1];

    expect(notificationButton).toHaveStyle({ borderRadius: 20 });
    expect(cartButton).toHaveStyle({ borderRadius: 20 });
    expect(screen.getByRole("img", { name: "알림" })).toHaveProp(
      "source",
      materialIconSource,
    );
    expect(screen.getByRole("img", { name: "장바구니" })).toHaveProp(
      "source",
      materialIconSource,
    );

    await user.press(cartButton);

    expect(onNotificationPress).not.toHaveBeenCalled();
    expect(onCartPress).toHaveBeenCalledTimes(1);
  });

  it("keeps standalone text actions working", async () => {
    const onPress = jest.fn();
    const user = createUser();

    await renderAsync(
      <ActionButton actions={[{ label: "취소", onPress }]} />,
    );

    const button = screen.getByRole("button", { name: "취소" });
    await user.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("provides a Material icon for every native tab", async () => {
    await renderAsync(<TabLayout />);

    expect(screen.getByRole("img", { name: "home" })).toBeOnTheScreen();
    expect(screen.getByRole("img", { name: "add_box" })).toBeOnTheScreen();
    expect(screen.getByRole("img", { name: "search" })).toBeOnTheScreen();
    expect(screen.getByRole("img", { name: "favorite" })).toBeOnTheScreen();
    expect(screen.getByRole("img", { name: "person" })).toBeOnTheScreen();
  });
});
