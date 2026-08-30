import { render, screen, userEvent } from "@testing-library/react-native";

import MyScreen from "@/app/(tabs)/my";
import AuthLayout from "@/app/auth/_layout";
import { useCurrentUser } from "@/features/auth";

const mockDismiss = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockCanDismiss = jest.fn(() => true);

jest.mock("expo-router", () => ({
  Redirect: () => null,
  Stack: Object.assign(
    ({ children }: { children: React.ReactNode }) => children,
    {
      Screen: () => null,
    },
  ),
  useRouter: () => ({
    canDismiss: mockCanDismiss,
    dismiss: mockDismiss,
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("@/features/auth", () => ({
  useCurrentUser: jest.fn(),
  useSignOut: () => jest.fn(),
}));

jest.mock("@/shared/components", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { accessibilityLabel: label, accessibilityRole: "button", onPress },
        React.createElement(Text, null, label),
      ),
    TitleHeader: ({
      children,
      title,
    }: {
      children?: React.ReactNode;
      title: string;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, title),
        children,
      ),
  };
});

describe("authentication surfaces", () => {
  it("shows a login action on My when no session exists", async () => {
    jest.mocked(useCurrentUser).mockReturnValue({
      authStatus: "unauthenticated",
      isPending: true,
    } as never);
    const user = userEvent.setup();

    render(<MyScreen />);

    expect(screen.getByText("로그인이 필요해요.")).toBeVisible();
    await user.press(screen.getByRole("button", { name: "로그인" }));
    expect(mockPush).toHaveBeenCalledWith("/auth");
  });

  it("lets users retry or close a modal after session hydration fails", async () => {
    const retryAuth = jest.fn(async () => undefined);
    jest.mocked(useCurrentUser).mockReturnValue({
      authStatus: "error",
      data: undefined,
      retryAuth,
    } as never);
    const user = userEvent.setup();

    render(<AuthLayout />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "로그인 정보를 불러오지 못했어요.",
    );
    await user.press(screen.getByRole("button", { name: "다시 시도" }));
    expect(retryAuth).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole("button", { name: "닫기" }));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });
});
