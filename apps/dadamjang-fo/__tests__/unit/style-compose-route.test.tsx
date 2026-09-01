import { render } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";

import RootLayout from "@/app/_layout";

const mockScreenOptions: Record<string, object> = {};
const mockPush = jest.fn();

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const Stack = ({ children }: { children: ReactNode }) =>
    React.createElement(View, null, children);
  const Screen = ({ name, options }: { name: string; options: object }) => {
    mockScreenOptions[name] = options;
    return null;
  };
  Screen.displayName = "MockStackScreen";
  Stack.Screen = Screen;
  return {
    router: { push: (...args: unknown[]) => mockPush(...args) },
    Stack,
  };
});

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/providers/app-providers", () => ({
  AppProviders: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/features/catalog", () => ({
  ShopFiltersProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/shared/observability/sentry", () => ({
  initSentry: jest.fn(),
  Sentry: {
    captureException: jest.fn(),
    wrap: (component: unknown) => component,
  },
}));

describe("style compose route", () => {
  it("uses the minimal native stack header for product back navigation", () => {
    render(<RootLayout />);

    expect(mockScreenOptions["product/[product-id]"]).toEqual(
      expect.objectContaining({
        headerBackButtonDisplayMode: "minimal",
        headerShown: true,
        presentation: "card",
        title: "상품 상세",
      }),
    );
  });

  it("renders cart as one icon-only product header action", () => {
    render(<RootLayout />);

    const options = mockScreenOptions["product/[product-id]"] as {
      headerRight?: () => ReactElement<{
        actions: {
          accessibilityLabel: string;
          icon: { md: string; sf: string };
          onPress: () => void;
        }[];
        iconOnly?: boolean;
      }>;
    };
    const cartAction = options.headerRight?.();

    expect(cartAction).toBeDefined();
    expect(cartAction?.props.iconOnly).toBe(true);
    expect(cartAction?.props.actions).toEqual([
      {
        accessibilityLabel: "장바구니",
        icon: { md: "shopping_cart", sf: "cart" },
        onPress: expect.any(Function),
      },
    ]);

    cartAction?.props.actions[0]?.onPress();
    expect(mockPush).toHaveBeenCalledWith("/cart");
  });

  it("disables the native dismiss gesture", () => {
    render(<RootLayout />);

    expect(mockScreenOptions["style-compose"]).toEqual(
      expect.objectContaining({ gestureEnabled: false }),
    );
  });
});
