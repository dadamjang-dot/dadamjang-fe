import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link } from "expo-router";
import { fireEvent, render } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import type { ReactNode } from "react";
import { Text } from "react-native";

import AuthScreen from "@/app/auth";
import { AuthFlowProvider } from "@/features/auth/auth-flow-provider";

const Home = () => <Link href="/auth/signin">Sign in</Link>;
const SignIn = () => <Link href="/(tabs)/shop">Shop</Link>;
const Product = () => <Text>Product detail</Text>;

const AuthWrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <AuthFlowProvider>{children}</AuthFlowProvider>
  </QueryClientProvider>
);

describe("Expo Router paths", () => {
  it("exposes a stable sign-in entry control", () => {
    render(<AuthScreen />, { wrapper: AuthWrapper });

    expect(screen.getByTestId("e2e.auth.open-signin")).toBeVisible();
    expect(screen.getByText("카카오로 시작하기")).toBeVisible();
    expect(screen.getByText("가입하기")).toBeVisible();
    expect(screen.getByText("이메일 찾기")).toBeVisible();
    expect(screen.getByText("비밀번호 찾기")).toBeVisible();
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
