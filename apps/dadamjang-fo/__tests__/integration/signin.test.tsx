import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import SigninScreen from "@/app/auth/signin";
import { signInFo } from "@/features/auth/api";
import { AuthFlowProvider } from "@/features/auth/auth-flow-provider";

const mockNavigation: { path?: string; pushed?: unknown } = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    replace: (path: string) => {
      mockNavigation.path = path;
    },
    push: (path: unknown) => {
      mockNavigation.pushed = path;
    },
  }),
}));

jest.mock("@/features/auth/api", () => ({
  signInFo: jest.fn(),
}));

let queryClient: QueryClient | undefined;

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });

  queryClient = client;

  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthFlowProvider>{children}</AuthFlowProvider>
    </QueryClientProvider>
  );
  TestWrapper.displayName = "SignInTestWrapper";
  return TestWrapper;
};

afterEach(() => {
  queryClient?.clear();
  jest.mocked(signInFo).mockReset();
  delete mockNavigation.path;
  delete mockNavigation.pushed;
});

describe("sign in", () => {
  it("shows validation without submitting empty credentials", async () => {
    jest
      .mocked(signInFo)
      .mockRejectedValueOnce(new Error("empty credentials submitted"));
    await render(<SigninScreen />, { wrapper: createWrapper() });

    await fireEvent.press(screen.getByTestId("e2e.auth.submit"));

    expect(
      screen.getByText("이메일과 비밀번호를 입력해 주세요."),
    ).toBeVisible();
  });

  it("shows an observable failure after rejected credentials", async () => {
    jest
      .mocked(signInFo)
      .mockRejectedValueOnce(new Error("invalid credentials"));
    await render(<SigninScreen />, { wrapper: createWrapper() });

    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.email.input"),
      "buyer@example.com",
    );
    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.password.input"),
      "wrong",
    );
    await fireEvent.press(screen.getByTestId("e2e.auth.submit"));

    await waitFor(() =>
      expect(
        screen.getByText("이메일 또는 비밀번호가 올바르지 않습니다."),
      ).toBeVisible(),
    );
  });

  it("navigates to home after accepted credentials", async () => {
    jest.mocked(signInFo).mockResolvedValueOnce({
      status: "SIGNED_IN",
      tokenPayload: {
        accessToken: "access",
        refreshToken: "refresh",
        role: "USER",
      },
      reactivationToken: null,
    });
    await render(<SigninScreen />, { wrapper: createWrapper() });

    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.email.input"),
      "buyer@example.com",
    );
    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.password.input"),
      "password",
    );
    await fireEvent.press(screen.getByTestId("e2e.auth.submit"));

    await waitFor(() => expect(mockNavigation.path).toBe("/"));
  });
});
