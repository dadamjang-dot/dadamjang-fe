import { render } from "@testing-library/react-native";
import type { ReactNode } from "react";

import RootLayout from "@/app/_layout";

const mockScreenOptions: Record<string, object> = {};

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  const Stack = ({ children }: { children: ReactNode }) =>
    React.createElement(View, null, children);
  const Screen = ({
    name,
    options,
  }: {
    name: string;
    options: object;
  }) => {
    mockScreenOptions[name] = options;
    return null;
  };
  Screen.displayName = "MockStackScreen";
  Stack.Screen = Screen;
  return { Stack };
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
  it("keeps product detail in the card stack after modal routes", () => {
    render(<RootLayout />);

    expect(mockScreenOptions["product/[product-id]"]).toEqual(
      expect.objectContaining({ presentation: "card" }),
    );
  });

  it("disables the native dismiss gesture", () => {
    render(<RootLayout />);

    expect(mockScreenOptions["style-compose"]).toEqual(
      expect.objectContaining({ gestureEnabled: false }),
    );
  });
});
