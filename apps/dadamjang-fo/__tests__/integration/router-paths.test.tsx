import { Link } from "expo-router";
import { fireEvent, render } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { Text } from "react-native";

import AuthScreen from "@/app/auth";

const Home = () => <Link href="/auth/signin">Sign in</Link>;
const SignIn = () => <Link href="/(tabs)/shop">Shop</Link>;
const Product = () => <Text>Product detail</Text>;

describe("Expo Router paths", () => {
  it("exposes a stable sign-in entry control", () => {
    render(<AuthScreen />);

    expect(screen.getByTestId("e2e.auth.open-signin")).toBeVisible();
  });

  it("moves through auth and tabs", async () => {
    const router = renderRouter(
      {
        index: Home,
        "auth/signin": SignIn,
        "(tabs)/shop": () => <Text>Shop</Text>,
      },
      { initialUrl: "/" },
    );

    await fireEvent.press(await screen.findByText("Sign in"));
    expect(router.getPathname()).toBe("/auth/signin");
    await fireEvent.press(screen.getByText("Shop"));
    expect(router.getPathname()).toBe("/shop");
  });

  it("resolves a product deep link with route params", async () => {
    const router = renderRouter(
      { "product/[product-id]": Product },
      { initialUrl: "/product/product-42" },
    );

    await screen.findByText("Product detail");
    expect(router.getPathname()).toBe("/product/product-42");
    expect(router.getSearchParams()).toEqual({ "product-id": "product-42" });
  });
});
