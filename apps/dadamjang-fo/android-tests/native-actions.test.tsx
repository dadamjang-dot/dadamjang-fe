import {
  renderAsync,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { View } from "react-native";

import {
  ActionButton,
  type Action,
} from "@dadamjang/mobile";
import TabLayout from "../src/app/(tabs)/_layout";
import { ProductLayout } from "../src/shared/components/product-layout";

jest.useFakeTimers();

const notificationAction = (onPress: () => void): Action => ({
  accessibilityLabel: "알림",
  icon: { md: "notifications", sf: "bell" },
  onPress,
});

const cartAction = (onPress: () => void): Action => ({
  accessibilityLabel: "장바구니",
  icon: { md: "shopping_cart", sf: "cart" },
  onPress,
});

const createUser = () =>
  userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe("Android native actions", () => {
  it("renders separate accessible actions and invokes their callbacks", async () => {
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

    const notificationButton = screen.getByRole("button", { name: "알림" });
    const cartButton = screen.getByRole("button", { name: "장바구니" });

    expect(notificationButton).toHaveAccessibleName("알림");
    expect(cartButton).toHaveAccessibleName("장바구니");
    expect(screen.getByRole("img", { name: "장바구니" })).toHaveProp(
      "source",
      { uri: "material-symbol://shopping_cart/20/white" },
    );

    await user.press(notificationButton);
    await user.press(cartButton);

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

    const notificationButton = screen.getByRole("button", { name: "알림" });
    const cartButton = screen.getByRole("button", { name: "장바구니" });

    expect(notificationButton).toHaveStyle({ borderRadius: 20 });
    expect(cartButton).toHaveStyle({ borderRadius: 20 });

    await user.press(cartButton);

    expect(onNotificationPress).not.toHaveBeenCalled();
    expect(onCartPress).toHaveBeenCalledTimes(1);
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
